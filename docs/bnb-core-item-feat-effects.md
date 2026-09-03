# bnb-core Item/Feat Effect Propagation

This document defines how equipped inventory items, feats, class features, and grouped special
traits attach calculated bonuses or display-only notes to arbitrary parts of a BeefBrain character
sheet.

## Context

Calculated fields throughout `bnb-core` follow a `[total, {componentKey: value, ...}]` tuple
pattern (skills, saves, AC, attacks, initiative, etc.). Before this feature, the only way for
equipped gear to contribute a bonus anywhere was `propagateEquipmentToAbilities`
(`packages/bnb-core/src/updateCalculatedFields.ts`), which is narrowly scoped to ability scores.

Example "final" fixtures had long included a `special.feats` list with a trailing tuple element
that looked like it declared effects (e.g. `["combat.attack.melee[longsword]", {atk: 1, note:
weapon-focus-longsword}]`), but no code anywhere in `bnb-core`, `bnb-latex`, or `bnb-web` ever read
that element — it was hand-authored, inert documentation. In real hand-authored character data
(`reference_material/beefy_boys_spreadsheets/yaml/*.yaml`) the same idea had already drifted into
more than ten mutually incompatible shapes with no engine to make any of them consistent.

This document defines the one shape going forward, shared by feats and items, and the engine that
makes it real.

## Design principle: positional, not labeled

BeefBrain YAML favors inferring meaning from position over labeled keys, so people can read and
hand-edit character sheets without learning a schema. An effect is a plain array:

```
[targetPath]
[targetPath, bonusDict]
[targetPath, noteString]
[targetPath, bonusDict, noteString]
```

- **`targetPath`** (string, required) — a dot-separated path rooted at `character`, e.g.
  `skills.use-magic-device`, `combat.initiative`, `combat.defense.special`. No leading dot, no
  `character.` prefix. A bracket suffix (`combat.attack.melee.longsword[0]`) is used **only** to pick
  a numeric channel on a named weapon — see "Target shapes" below. Every other target is written with
  no bracket at all, including tag/note pushes.
- **`bonusDict`** (plain object, optional) — **key names should identify the source** (the feat or
  item name, slugified: `weapon-focus-longsword`, `magic-ring`), not a generic category
  (`atk`, `feats`). Values are numbers. Merged directly into the target's existing component map —
  there is no `bonus:` wrapper key, and no separate `note` needed alongside it: the key name itself
  documents what the bonus is. Naming keys this way is what makes same-key collisions between
  unrelated sources rare in practice (see "Known limitation" below).
- **`noteString`** (string, optional) — a human-readable reminder, written as a full sentence
  (`"Blind Fight: reroll concealment misses"`), not a terse slug. Used on its own (no `bonusDict`)
  when a feat/item has a real rules effect that isn't a simple numeric bonus. The engine figures out
  where it goes from the target's shape — see `applyNoteOnly` below — no bracket needed.

A feat is `[name, source, effects?]`. An item is `[name, qty, category, weight, price, props?, tags?,
effects?]` — effects is the item tuple's new (optional) 8th element, after tags. A class feature or
grouped special trait is `[name, effects?]` — see "Grouped special traits and class features"
below. `effects` in all cases is a list of zero or more of the arrays above.

```yaml
special:
  feats:
    - [Weapon Focus (Longsword), fighter: 1, [["combat.attack.melee.longsword[0]", {weapon-focus-longsword: 1}]]]
    - [Blind-Fight, level: 1, [[combat.defense.special, "Blind Fight: no advantage to invisible melee attackers"], [combat.attack.melee._, "Blind Fight: reroll concealment misses"], [movement.special, "Blind Fight: 1/2 penalty when unable to see"]]]
    - [Improved Initiative, human: 1, [[combat.initiative, {improved: 4}]]]
  storm-giant:
    - [Enhanced Swimming, [[skills.swim, "+8 for special actions/avoid hazards, can always take 10, swim 'run', ignore weight penalties"]]]
inventory:
  equipped:
    - [ring of use magic device, 1, wondrous, 0 lbs, 5000 gp, {}, [], [[skills.use-magic-device, {magic-ring: 5}]]]
```

Note the quotes around any path with a bracket suffix (`"combat.attack.melee.longsword[0]"`) — YAML's flow-sequence syntax treats an unquoted `[` as the start of a nested sequence, so a bracket-suffixed path must be quoted to parse as a single string. Paths with no bracket don't need quoting.

Feats/items with no meaningful calculable or displayable target simply omit `effects` entirely
(e.g. `[Exotic Weapon Proficiency (Bastard Sword), fighter: 1]`) — there is no obligation to model
every rules text as an effect.

## Grouped special traits and class features

`special.feats` is the only key under `special` with the 3-tuple `[name, source, effects?]` shape.
Every other key — the fixed `class-features` key, plus any freely-named **trait source** key
(a race, template, curse, or anything else that grants a bundle of traits as a unit: `elven`,
`were-rat`, `storm-giant`, ...) — is a list of `[name, effects?]` tuples: the same effects shape as
a feat's, minus the source dict, since the source is already the key (or, for `class-features`, the
fact that it's a class feature) the entry lives under:

```yaml
special:
  feats:
    - [Iron Will, level: 1]
  class-features:
    - ["Turn Undead (4/day, 2d6+5, turning check 1d20+5)"]
    - [Divine Grace, [[combat.saves.fortitude, {cha: 0}], [combat.saves.reflex, {cha: 0}], [combat.saves.will, {cha: 0}]]]
  elven:
    - [Keen Senses, []]
  were-rat:
    - [Scent, []]
    - [Cunning, [[skills.hide, {were-rat: 4}]]]
```

Trait/class-feature effects propagate exactly like feat effects — bonuses merge into a
`[total, {mods}]` target and resum, notes go wherever `applyNoteOnly` decides based on the target's
shape — and, like feats, they're always active once present (no equip/unequip concept). A feature
with nothing calculable or displayable, like Turn Undead above, is simply a name with no `effects`
element at all — same as a feat with no meaningful target. Quote a name that contains a comma
(`"Turn Undead (4/day, ...)"`) since YAML's flow-sequence syntax would otherwise split it into
several list items.

The point of grouping traits by source is that a whole source can be added or removed as a unit: if
an elf is cured of lycanthropy, deleting the `were-rat` key removes exactly those traits and
effects, leaving `elven` (and `feats`, `class-features`) untouched. See "Cleanup on equip/unequip
and feat changes" below for what happens to previously-written bonus values when a source is
deleted rather than emptied.

### Piggybacking an ability modifier onto a bonus (Divine Grace)

A feat/trait bonus is normally a fixed number frozen at authoring time (`{weapon-focus-longsword:
1}`) — right for something like a weapon feat, wrong for a paladin's Divine Grace, whose value must
track the *current* Charisma modifier as it changes (leveling, an ability-boosting item, a curse).

Rather than invent a formula language for effects, Divine Grace's bonus dict uses the reserved key
name `cha` — one of the schema's `componentBindings` names (`str`/`dex`/`con`/`int`/`wis`/`cha`/
`bab`) — instead of a source-slugged key. `applyComponentBindings` (`genericEngine.ts`) already
walks the whole character tree every calculation pass rewriting any `mods` key matching a binding
name to that binding's live value and resumming; this is the exact same mechanism spell-like
ability DCs already piggyback on (see `DND35-QUESTIONS.md` #11). `updateCalculatedFields` runs
component bindings a second time immediately after effect propagation (step 7.6) specifically so
that a `cha` key an effect just introduced (or reset back to its authored placeholder value) is
corrected to the live modifier in the *same* pass — otherwise it would take an extra recalculation
to converge.

This only works for the reserved binding names, and only because their meaning (the current value
of a named ability modifier) is unambiguous no matter which feat/trait/class-feature declared them
— it deliberately breaks the "name your bonus key after its source" collision-avoidance convention
(see "Known limitation" below), which is fine here since two different sources both wanting "the
current Charisma modifier" at the same target should in fact collide (both would write the same
value, from the same live number). A calculated bonus that isn't simply "the current value of one
of these seven bindings" still has no engine support — it needs a real numeric bonus dict, same as
any other feat/item effect.

## Target shapes and bracket semantics

The engine resolves a path's segments via plain property access on `character`. What happens next
depends on whether the effect carries a `bonusDict` or just a `noteString`, and on the shape found at
the target.

**Bonus effects** (`bonusDict` present) always need a `[total, {mods}]`-shaped target:

1. **Plain `[total, {mods}]`** — skills, saves, initiative, speed, grapple, AC / touch-AC /
   flat-footed-AC, ACP, and the mods element (index 1) of a generic attack tuple
   (`combat.attack.melee._`). No bracket needed. `bonusDict` merges into `mods`, the total is resummed
   via `sumValues` and written back to element 0.
2. **Named weapon, attack channel** (`combat.attack.melee.longsword[0]`) — a named weapon tuple
   (`[total, damage, critical, {atkMods}, {abilityMod}, {dmgMods}, [tags]]`) has three numeric
   "slots" (attack/damage/critical), so a bonus there requires the `[0]` bracket to say which one:
   merges into element 3 (`atkMods`), resums into element 0. `[1]` (damage) and `[2]` (critical) are
   **not implemented** and throw `EffectTargetError` — see below. A bracket anywhere else (a
   non-weapon target, or any index but 0/1/2) also throws.
3. **Anything else** — including ability score components — throws `EffectTargetError`. Ability
   scores are deliberately out of scope: they're already owned by `propagateEquipmentToAbilities`
   and are resummed with the stricter `sumOfValues`, which (unlike `sumValues`) does not tolerate a
   non-numeric value sitting in the same component map.

**Note-only effects** (no `bonusDict`) never use a bracket — there's no numeric channel to
disambiguate, so the target's own shape says where the note goes (`applyNoteOnly` in
`propagateEffects.ts`):

- Target doesn't exist yet → create it as a fresh `[note]` tag list (how `movement.special` gets
  populated the first time a feat references it).
- Target is already a flat tag list (`combat.defense.special: [...]`) → push the note onto it.
- Target is a tuple whose *last* element is itself an array (`combat.attack.melee._: [total, {mods},
  [tags]]`, and this also covers a named weapon's trailing tags array) → push the note onto that
  trailing array, not the mods object.
- Target is a plain `[total, {mods}]` tuple with no trailing array → merge the note into `mods` under
  a `note` key. This is a rare fallback; most note-worthy targets have a dedicated tag list.

This means the exact same `combat.attack.melee._` path takes a bonus at element 1 (no bracket) but
takes a note at element 2 (also no bracket) — the presence of `bonusDict` vs `noteString` on the
effect itself, not a bracket, decides which.

### Why damage and critical channels are deferred

Unlike attack bonuses, damage and critical modifiers in this data model aren't simple numeric sums
— damage is a dice-and-modifier string (`1d8+2 slashing`) and critical is a threat-range string
(`19-20/x2`).

For **melee** damage specifically, the splice mechanism to make this work already exists:
`propagateToMeleeWeaponDetails` (`packages/bnb-core/src/updateCalculatedFields.ts`) already resums
element 4 of a named melee weapon tuple (the damage component map, e.g. `{str: 2}`) and re-splices
the total into the damage string. A future change could merge a bonus into that same element and get
correct behavior for free. It's deferred in this pass anyway, to keep scope matched to what this
engine was actually built for (skills and attack bonuses) rather than opportunistically wiring up a
channel nothing currently asks for. **Ranged** weapons have no equivalent — `propagateToRangedWeaponDetails`
never reads or resums a damage component map at all — so a damage channel there would need that
splice mechanism built first, not just reused.

Critical multiplier/threat-range changes have no supporting mechanism anywhere in the codebase for
either melee or ranged weapons — no code parses or rewrites a critical string like `19-20/x2` today.
That's genuinely new design work, not a matter of reusing something that already exists.

Rather than guess at either design under time pressure, `[1]`/`[2]` fail loudly (`EffectTargetError`)
so a future change can add them deliberately, informed by which weapon shape it's targeting.

## Cleanup on equip/unequip and feat changes

Every calculation pass:

1. Collect every `(target, bonusKey)` pair declared by *any* feat, *any* grouped trait, and *any*
   item **currently present in the file being calculated**, regardless of whether the item is
   presently equipped. This is the universe of keys the engine is allowed to touch on this pass.
2. Delete each such key from its target's component map, if present.
3. Re-apply only the currently active subset: all feats and grouped traits (both are always active
   once granted) plus items in the equipped container(s) named by `inventory._on` (the same
   containers `propagateEquipmentToAbilities` already uses).
4. Resum every touched target via `sumValues`.

This mirrors the existing "clear stale keys, then reapply" pattern already used by
`propagateEquipmentToAbilities`, and needs no extra bookkeeping across calculation passes — as long
as the source that declared a key is still present in the file. **This is a real limitation, not
just a style note**: because bonus key names are freeform (`magic-ring`, `atk`, `feats`, ...) rather
than a fixed recognizable pattern (contrast `propagateEquipmentToAbilities`'s `-enhancement` suffix,
or `propagateToSynergy`'s fixed `synergy-<source>` shape), the engine can only reconcile keys whose
*declaring effect entry is still in the file*, active or not. If a feat or item is deleted from the
YAML entirely (not just unequipped), any value it previously wrote is indistinguishable from a value
the player typed by hand, and is left behind. Removing a feat/item's effect should be paired with
manually clearing the value it wrote, the same as removing any other hand-maintained bonus.

## Known limitation: same-key collisions

Bonus keys are author-chosen, not auto-generated, so two unrelated sources can still legally choose
the same key at the same target — the engine does not sum same-key contributions from different
sources, the last one applied wins. **Naming bonus keys after their source** (`weapon-focus-longsword`,
`magic-ring`) rather than a generic category (`atk`, `feats`) is how this is avoided in practice: two
different feats/items essentially never share a slugified name. This isn't a rule the engine enforces
— it's a convention — so it's still possible to collide by choosing the same generic key on purpose,
same as BeefBrain's older categorical component keys (`feats`, `racial`, `class`) always could. If
colliding contributions ever need to legitimately stack, that's a follow-up (summing when both values
are plain numbers under a shared key), not something this pass solves.

## Out of scope

- Migrating `reference_material/beefy_boys_spreadsheets/` — that's real player data outside this
  repo's test/example scope, not fixtures this engine is validated against.
- Damage bonus and critical multiplier channels (see above).
- Automatic governing-ability lookup for skills missing their ability-mod component key — this
  engine only ever adds/removes the keys it owns; it does not validate or backfill the rest of a
  skill's component map.
