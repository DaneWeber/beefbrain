# bnb-cli --calc findings from Beefy Boys character sheets

Ran `bnb-cli --calc` against all 8 character YAMLs. These are discrepancies between
the hand-authored values and what the calculator produced.

## Recurring issues (across multiple characters)

### Synergy double-counting
The calculator adds its own `synergy-X` bonus on top of manually-entered synergy bonuses
with different naming. For example, `tumble-synergy: 2` in the input becomes
`tumble-synergy: 2, synergy-tumble: 2` in the output, doubling the bonus.

Affected: Ryan (jump, tumble), Jason (knowledge-nature, ride), Andy (balance, jump,
knowledge-nature, tumble, ride), Ben (balance, jump, tumble), Mike (balance, jump,
diplomacy, intimidate, sleight-of-hand), Don (spellcraft), Chuck (spellcraft), Hibl (use-magic-device)

### BAB calculation wrong for multi-class and medium/poor progressions
The calculator recalculates BAB from class levels but gets it wrong:
- **Chuck**: Cleric 9 / MT 3 → calc says BAB 1 (should be 8). Appears to use level 1 values.
- **Jason**: Druid 12 → calc says BAB 0 (should be 9)
- **Andy**: Ranger 6/Fighter 3/Rogue 4 → calc says BAB 9 (should be 12)
- **Mike**: Rogue 10/Were-Rat 1 → calc says BAB 0 (should be 7)
- **Hibl**: Sorcerer 13 → calc says BAB 6 (correct!)
- **Don**: Wizard 12 → calc says BAB 6 (correct!)

Pattern: `poor` and `medium` progressions work, but `good` and multi-class seem broken.
The BAB errors cascade into all melee/ranged/grapple attack calculations.

### 2-handed strength damage not applied
Weapons tagged `2-hand` should use 1.5x str mod for damage. The calculator uses base str
mod instead.

Affected: Ryan (Frost Brand greatsword: 2d6+6 instead of 2d6+12)

### Weapon special damage bonuses not in damage string
Enhancement bonuses and weapon specialization are in the damage breakdown but not
reflected in the recalculated damage string.

Affected: Ryan (Bastard Sword damage: 1d10+6 instead of 1d10+9)

### Heavy armor speed reduction ignored
The calculator doesn't account for heavy armor reducing base speed from 30 to 20.

Affected: Ryan (speed 30 instead of 20)

### Carrying capacity uses wrong Str score
For characters with Str-enhancing items, the calculator appears to use the wrong Str
value for carrying capacity.

Affected: Chuck (capacity shows light: 23 lbs — that's Str 7 capacity, but should use
total equipped Str), Jason (capacity light: 26 lbs — Str 8 base, correct if no belt)

### Load calculation includes/excludes horse differently
The calculator adds horse location weight to the total in some cases. Our hand-authored
values excluded horse from character load.

Affected: Ryan (load 133.2 vs 129.16), Hibl (load 56.9 vs 52.9), Ben (load 56.1 vs 13.29)

### `_` reference in shield bash double-counts
Lion Shield attack: calculator added `_: 19` (base melee) on top of `bab: 13`, getting
attack bonus 32 instead of 13.

Affected: Ryan (lion-shield)

### HD value recalculated incorrectly for multi-class
The `hd` field gets overwritten:
- Andy: `[13, "6d8 + 3d10 + 4d6"]` → `[13, 10]` (lost the multi-die breakdown,
  used the highest HD)
- Mike: `[11, {rogue: 6, were-rat: 8}]` → `[11, 8]`
- Chuck: `[12, {cleric: 8, mystic-theurge: 4}]` → `[12, 8]`

### Flow maps in spells-per-day get expanded
`{0: 6, 1: 8, ...}` becomes multi-line with quoted keys `"0": 6`. The flow format
doesn't round-trip.

### Template deltas lose `+` prefix
In Mike's templates, `[+6, were-rat: 6]` becomes `[6, were-rat: 6]`. The `+` sign
indicating a delta (not absolute) is lost, making deltas indistinguishable from absolutes.

---

## Per-character details

### Ryan (Landorf) - Fighter 13
- **Frost Brand damage**: `2d6+12+1d6 cold` → `2d6+6+1d6 cold` (2-hand str bug)
- **Bastard Sword damage**: `1d10+9` → `1d10+6` (weapon-spec not in string)
- **Lion Shield attack**: 13 → 32 (double-counted `_`)
- **Speed**: 20 → 30 (heavy armor ignored)
- **Jump**: 12 → 14 (synergy double-count)
- **Tumble**: 7 → 9 (synergy double-count)
- **Load**: 129.16 → 133.2 (includes horse items)

### Chuck (Phileum Collins) - Cleric 9 / Mystic Theurge 3
- **BAB**: 8 → 1 (broken for multi-class)
- **All attacks**: cascade from BAB (melee -1, ranged 0, grapple -1 instead of 6, 7, 6)
- **Mace damage**: `1d6-2` → `1d6+-2` (formatting: should be `1d6-2`)
- **ACP**: -5 → -6 (calc says heavy-load: -6 instead of armor: -5)
- **Speed**: 20 stays 20 but reason changed from `heavy-armor: -10` to `heavy-load: -10`
- **Capacity**: correct for Str 7 (23/46/70) — but note Str 7 is very low for a full plate wearer
- **Spellcraft**: 8 → 10 (synergy double-count)
- **Flat-footed AC**: lost braces, gained dex: -1 (should NOT include dex in flat-footed)

### Jason (Tallinn) - Druid 12
- **BAB**: 9 → 0 (broken)
- **All attacks**: cascade (melee -1, ranged 0, grapple -1 instead of 8, 9, 8)
- **Quarterstaff damage**: `1d6+1` → `1d6+-1` (uses base str -1 instead of str -1 + enh 2 = 1)
- **_points**: 105 → 83 (recalculated incorrectly — dropped int bonus?)
- **Knowledge-nature**: 20 → 22 (synergy double-count)
- **Ride**: 12 → 14 (synergy double-count)
- **Speed**: 30 → 20 with `medium-load: -10` (calc thinks Jason is medium loaded)
- **Capacity**: light 26/medium 53/heavy 80 — different from our 100/200/300
  (calc uses Str 8 = 26 lbs light; we used Str 10-equivalent? Need to verify)

### Hibl (Burley) - Sorcerer 13
- **BAB**: 6 → 6 (correct!)
- **Dagger damage**: `1d4-2` → `1d4+-2` (formatting)
- **AC**: 24 → 21 (calc changed dex from 4 to 1 — max-dex capped by armor?)
- **Touch AC**: 16 → 13 (cascade from dex change)
- **Speed**: 30 → 20 with `heavy-load: -10` (Str 7, light capacity 23 lbs, load 56.9 lbs — actually correct! Hibl IS overloaded with all that gear)
- **Load**: 52.9 → 56.9 (includes horse weight)
- **Use Magic Device**: 7 → 9 (synergy from spellcraft added: +2)

### Don (Cade) - Gnome Wizard 12
- **BAB**: 6 → 6 (correct!)
- **Load**: 26.42 → 26.4 (rounding)
- **Capacity**: 25/50/75 → 33/66/100 (calc uses different Str for Small creature?)
- **Spellcraft**: 22 → 24 (synergy double-count)
- No other significant changes — cleanest result!

### Andy (Black Stag) - Ranger 6 / Fighter 3 / Rogue 4
- **BAB**: 12 → 9 (multi-class BAB broken — rogue 4 counted as 0)
- **All attacks**: cascade from BAB
- **AC**: 29 → 26 (dex changed from 6 to 3 — max-dex capping?)
- **Touch AC**: 17 → 14
- **Horned Helm damage**: `1d8+2` → `1d8+5` (calc uses full str instead of 1/2 str for secondary)
- **Speed**: 30 → 20 with `medium-load: -10` (245.5 lbs load vs 266 medium — actually Andy IS in medium load! Our value of 30 may be wrong, unless the mithral armor or haversack helps)
- **Balance**: 10 → 12 (synergy double-count)
- **Jump**: 12 → 14 (synergy double-count)
- **Knowledge-nature**: 11 → 13 (synergy double-count)
- **Tumble**: 18 → 20 (synergy double-count)
- **Ride**: 11 → 13 (synergy added)

### Ben (Surfeit) - Amethyst Dragon 10 HD
- **Claws damage**: `1d6+3` → `1d6+6` (calc uses full str instead of 1/2 str for secondary)
- **Wings damage**: `1d4+3` → `1d4+6` (same issue)
- **Balance**: 15 → 17 (synergy from tumble added)
- **Jump**: 19 → 21 (synergy from tumble added)
- **Tumble**: 17 → 19 (existing jump-synergy: 4 kept, then synergy-jump: 2 added — was the original 4 wrong? should be 2?)
- **Load**: 13.29 → 56.1 (calc includes all equipped items differently)

### Mike (Illigrim) - Elf Rogue 10 / Were-Rat 1
- **BAB**: 7 → 0 (broken — rogue 10 medium BAB = 7, not 0)
- **All attacks**: cascade from BAB
- **Balance**: 11 → 13 (synergy double-count)
- **Diplomacy**: 3 → 5 (synergy double-count)
- **Intimidate**: 3 → 5 (synergy double-count)
- **Jump**: 9 → 11 (synergy double-count)
- **Sleight-of-hand**: 16 → 18 (synergy double-count)
- **Templates**: `+` prefix on deltas stripped, flow arrays expanded to block style
- **Load**: 80.86 → 97.2 (different weight calculation)

---

## Summary of calculator bugs to fix

1. **BAB calculation for good/medium progressions** — most impactful, cascades everywhere
2. **Synergy double-counting** — adds its own synergy when one already exists with different naming
3. **2-handed str multiplier** — not applying 1.5x str for 2-hand weapons
4. **Secondary natural attack str** — not applying 0.5x str for secondary attacks
5. **Heavy armor speed reduction** — not recognized
6. **Max-dex from armor** — may be capping dex incorrectly in some cases (Hibl, Andy)
7. **Damage string formatting** — produces `1d6+-2` instead of `1d6-2`
8. **Shield bash `_` reference** — double-counts base melee
9. **HD field for multi-class** — loses multi-die format
10. **Template delta `+` prefix** — stripped during serialization
11. **Flow map round-trip** — `{0: 6, 1: 8}` doesn't survive serialization
12. **Carrying capacity** — possible issues with Small size and/or enhanced Str

## Possible errors in hand-authored YAML (calc may be right)

- **Hibl speed**: Str 7, load 52.9+ lbs, light capacity 23 lbs → Hibl is actually heavily loaded! Speed 20 may be correct.
- **Andy speed**: 245 lbs with medium capacity 266 → Andy is in medium load. Speed 20 may be correct.
- **Ben tumble synergy**: We had `jump-synergy: 4` but Jump synergy gives +2, not +4. The `4` may be wrong.
- **Jason capacity**: Our values (100/200/300) match Str 10, but Jason has Str 8 (capacity 26/53/80). Our values may be from the CSV which could be wrong.
