# D&D 3.5e Implementation Questions

Questions for Dane about rules interpretations and data format decisions.

## Resolved

1. **Ranged attack total bug**: The example files had `ranged: _: [1, {bab: 1, dex: 1}]` — total should be 2 (1+1). Fixed in all example files.

## Open Questions

### Data Format

1. **Flat-footed AC structure**: The dex test file uses `[6, base: 10, dex: -4]` which YAML parses as 3 separate elements. I normalized this to `[total, {merged-mods}]` (2 elements) during calculation. Is that the right canonical format, or do you prefer the spread format for single-key entries?

2. **Weapon damage strings**: Currently the code updates damage strings by regex-replacing `XdY+N` patterns (e.g., `1d8+2` → `1d8+4`). This is fragile — what about 2-handed weapons (1.5x Str), off-hand (0.5x Str), or ranged weapons that don't add Str? Should we track the damage modifier separately in the data structure?

3. **Perform/Craft/Knowledge skill naming**: Skills like `perform-x`, `craft-weaponsmithing`, `knowledge-arcana` — I'm matching the prefix (`perform-*` → cha, `craft-*` → int, `knowledge-*` → int). Is that the intended naming convention?

### Calculation Rules

4. **Max Dex from armor vs encumbrance**: The character has `max-dex: [3, medium-load: 3]` and the chain shirt has `max-dex: 4`. Per rules, you use the worse of armor or load. Should the calculator determine the effective max-dex and cap the Dex bonus in AC? Currently the AC just uses the raw dex mod without capping.

5. **Armor Check Penalty stacking**: Similarly, `acp: [-3, medium-load: -3]` but the chain shirt has `acp: -2` and heavy steel shield has `acp: -2`. Per rules, you add armor + shield ACP and compare with load ACP, taking the worse. Should the calculator derive ACP from equipment?

6. **HP calculation**: Currently `max-hp: [11, {con: 1, rolls: 10}]` treats con as a flat value. At higher levels, con mod applies per level (e.g., at level 5 with +2 Con mod, it's +10 to HP). Should `con` in the max-hp modifiers represent `con_mod * total_level`, or should the calculator derive it?

7. **Multiclassing BAB and saves**: When multiclassing, BAB and base saves come from each class independently. Is the plan to track these per-class in the levels section and sum them, or are they manually entered?

8. **Speed reduction from armor/load**: The character has `speed: [20, {base: 30, medium-load: -10}]`. Is `-10` always the right reduction, or should the calculator derive it from the load/armor category? (30 ft base → 20 ft in medium/heavy armor or medium/heavy load per the rules.)

### Feature Scope

9. **Synergy bonuses**: Should the calculator auto-apply skill synergy bonuses (e.g., +2 Diplomacy if you have 5+ ranks in Bluff)? This would require the calculator to inspect rank values across skills.

10. **Equipment-derived stats**: Should the calculator eventually read equipment entries (armor AC bonus, weapon stats, magic item ability bonuses) and auto-derive combat stats? Or is that manual entry with the calculator just propagating ability mods?
