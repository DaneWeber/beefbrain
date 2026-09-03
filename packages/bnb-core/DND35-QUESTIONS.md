# D&D 3.5e Implementation Questions

All questions resolved as of 2026-09-03.

## Resolved

1. **Flat-footed AC structure**: Use spread format (separate single-key maps). `[6, base: 10, dex: -4]` not `[6, {base: 10, dex: -4}]`.

2. **Weapon damage strings**: Keep as human-readable strings. Improve regex for 2-handed (1.5x Str), off-hand (0.5x Str), ranged (no Str).

3. **Skill naming**: Prefix-based ability mapping — `perform-*` → cha, `craft-*` → int, `knowledge-*` → int, `profession-*` → wis.

4. **Max Dex**: Derive from equipped armor AND load (take worse). Cap dex in AC when max-dex < dex mod.

5. **ACP**: Derive from armor + shield (summed) vs load (take worse). Propagate to skills.

6. **HP**: `max-hp` has `con` (= con_mod × total_HD) and `rolls` (= sum of all class hp). Classes track individual rolls: `fighter: [3, {hd: 10, hp: [10, 8, 6]}]`.

7. **Multiclassing BAB/saves**: Per-class in modifiers: `fortitude: [5, {fighter: 3, wizard: 0, con: 2}]`.

8. **Speed**: Derive reduction from armor/load. Expressed as negative modifier summing to total.

9. **Synergy bonuses**: Auto-calculate unconditional synergies. Conditional ones need a sub-value pattern TBD.

10. **Equipment-derived stats**: Core feature. Read inventory to derive AC, ACP, weapon stats, magic item bonuses. Key use case: swap equipment, all stats cascade.

11. **Spell-like abilities**: Separate top-level `character.spell-like-abilities`, keyed by source (race, template, item), not folded into `special.racial-traits`/`class-features` (which stay untyped free text) or `character.spells` (which is shaped for Vancian casters). Each source has an optional `_` default (`{cl, save}`) plus named abilities: `name: [frequency, dc: [total, {components}]]`. DC totals piggyback on the existing `cha`/`str`/etc. componentBindings + generic `[total, {mods}]` resum walk — no new calculation code needed.

## General Principle

Calculate when we have the data. Trust user-entered values when we don't. Only override when we can definitively calculate the correct value.
