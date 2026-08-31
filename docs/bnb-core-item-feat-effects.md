# bnb-core Item/Feat Effect Propagation

This document defines how equipped inventory items and feats attach calculated bonuses or
display-only notes to arbitrary parts of a BeefBrain character sheet.

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
  `character.` prefix. The last segment may carry a bracket suffix (`combat.attack.melee.longsword[0]`)
  — see "Target shapes" below for what the bracket means.
- **`bonusDict`** (plain object, optional) — keys are bonus-source names chosen by whoever is
  authoring the sheet (`atk`, `magic-ring`, `feats`, ...), values are numbers. Merged directly into
  the target's existing component map — there is no `bonus:` wrapper key.
- **`noteString`** (string, optional) — a human-readable reminder. If `bonusDict` is also present,
  the note is merged into the *same* component map under a `note` key (this reproduces the exact
  shape the old inert fixture data already used: `{atk: 1, note: weapon-focus-longsword}`). If no
  `bonusDict` is given and the target resolves to an array, the note is pushed into that array as a
  tag instead (creating the array if it doesn't exist) — this is how `combat.defense.special:
  [blind-fight]` gets populated.

A feat is `[name, source, effects?]`. An item is `[name, qty, category, weight, price, props?, tags?,
effects?]` — effects is the item tuple's new (optional) 8th element, after tags. `effects` in both
cases is a list of zero or more of the arrays above.

```yaml
special:
  feats:
    - [Weapon Focus (Longsword), fighter: 1, [[combat.attack.melee.longsword[0], {atk: 1}, weapon-focus-longsword]]]
    - [Blind-Fight, level: 1, [[combat.defense.special, blind-fight], [combat.attack.melee._[2], blind-fight]]]
    - [Improved Initiative, human: 1, [[combat.initiative, {feats: 4}]]]
inventory:
  equipped:
    - [ring of use magic device, 1, wondrous, 0 lbs, 5000 gp, {}, [], [[skills.use-magic-device, {magic-ring: 5}]]]
```

Feats/items with no meaningful calculable or displayable target simply omit `effects` entirely
(e.g. `[Exotic Weapon Proficiency (Bastard Sword), fighter: 1]`) — there is no obligation to model
every rules text as an effect.

## Target shapes and bracket semantics

The engine resolves a path's segments via plain property access on `character`. Once resolved, how
an effect is applied depends on the shape found there:

1. **Plain `[total, {mods}]`** — skills, saves, initiative, speed, grapple, AC / touch-AC /
   flat-footed-AC, ACP. No bracket needed. `bonusDict`/`note` merge into `mods` (element 1), the
   total is resummed via `sumValues` and written back to element 0.
2. **Generic attack `[total, {mods}, [tags]]`** (e.g. `combat.attack.melee._`) — bonus case is
   identical to shape 1 (mods still at element 1). A bracket of `[2]` on a note-only effect addresses
   the tags array literal-positionally (`combat.attack.melee._[2]`).
3. **Named weapon `[total, damage, critical, {atkMods}, {abilityMod}, {dmgMods}, [tags]]`** (e.g.
   `combat.attack.melee.longsword`) — the bracket is **required** here and is a semantic channel
   selector, not a literal array index:
   - `[0]` — attack bonus. Merges `bonusDict`/`note` into element 3 (`atkMods`), resums into element 0.
   - `[1]` — damage bonus. **Not implemented.** Throws `EffectTargetError`.
   - `[2]` — critical multiplier change. **Not implemented.** Throws `EffectTargetError`.
   - A literal array-index bracket (e.g. `[6]` for the tags array) still works for a note-only push,
     same as shape 2.
4. **Anything else** — including ability score components — throws `EffectTargetError`. Ability
   scores are deliberately out of scope: they're already owned by `propagateEquipmentToAbilities`
   and are resummed with the stricter `sumOfValues`, which (unlike `sumValues`) does not tolerate a
   non-numeric `note` value sitting in the same component map.

### Why damage and critical channels are deferred

Unlike attack bonuses, damage and critical modifiers in this data model aren't simple numeric sums
— damage is a dice-and-modifier string (`1d8+2 slashing`) and critical is a threat-range string
(`19-20/x2`). Doubling a threat range or splicing a flat damage bonus into that string requires real
string composition/parsing logic that doesn't exist yet and wasn't concretely needed for the feature
that motivated this engine (skill and attack bonuses). Rather than guess at that design under time
pressure, `[1]`/`[2]` fail loudly so a future change can add them deliberately.

## Cleanup on equip/unequip and feat changes

Every calculation pass:

1. Collect every `(target, bonusKey)` pair declared by *any* feat and *any* item anywhere in the
   file, regardless of whether the item is currently equipped. This is the full universe of keys the
   engine is allowed to touch.
2. Delete each such key from its target's component map, if present.
3. Re-apply only the currently active subset: all feats (feats are always active once granted) plus
   items in the equipped container(s) named by `inventory._on` (the same containers
   `propagateEquipmentToAbilities` already uses).
4. Resum every touched target via `sumValues`.

This mirrors the existing "clear stale enhancement keys, then reapply" pattern already used by
`propagateEquipmentToAbilities`, and needs no extra bookkeeping across calculation passes.

## Known limitation: same-key collisions

Bonus keys are author-chosen, not auto-generated, so two unrelated sources can legally choose the
same key at the same target (e.g. two different feats both writing `feats: 4` onto
`combat.initiative`). The engine does not sum same-key contributions from different sources — the
last one applied wins. This isn't a new problem introduced by this engine: BeefBrain's component
keys are already categorical labels (`feats`, `racial`, `class`) rather than per-source-unique
identifiers, so this ambiguity predates this feature. It is not solved here; if it becomes a real
problem, the fix belongs in a follow-up that gives colliding sources a way to combine rather than
overwrite (e.g. summing when the existing value and the new value are both plain numbers under a
known category key).

## Out of scope

- Migrating `reference_material/beefy_boys_spreadsheets/` — that's real player data outside this
  repo's test/example scope, not fixtures this engine is validated against.
- Damage bonus and critical multiplier channels (see above).
- Automatic governing-ability lookup for skills missing their ability-mod component key — this
  engine only ever adds/removes the keys it owns; it does not validate or backfill the rest of a
  skill's component map.
