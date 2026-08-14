# Skill Points Restructure - Summary

## Overview
Restructured the skill points tracking in character YAML files to follow a more consistent pattern used elsewhere in the codebase.

## Changes Made

### 1. YAML Structure Update
**Old Format:**
```yaml
climb: [13, {str: 5, ranks: 8}, {points: {ranger: 7, fighter: 1}}]
```

**New Format:**
```yaml
climb: [ 13, { str: 5, ranks: [ 8, { ranger: 7, fighter: 1 } ] } ]
```

The `{points: {...}}` object has been removed, and the class breakdown is now nested directly within the `ranks` field using the standard array pattern `[total, {breakdown}]`. The formatting follows bnb-core's compact YAML style with spaces inside brackets and braces.

### 2. Files Updated

#### Character YAML Files (9 files)
All character YAML files in `reference_material/beefy_boys_spreadsheets/yaml/` were updated:
- andy-black-stag.yaml
- ben-surfeit.yaml
- chuck-phileum-collins.yaml
- don-cade.yaml
- hibl-burley.yaml
- jason-tallinn.yaml
- mike-illigrim.yaml
- npc-runa.yaml
- ryan-landorf.yaml

#### Code Files
- **packages/bnb-web/src/lib/format.ts**: Updated `formatBreakdown()` function to handle the nested ranks structure and display it as "Ranks: 8 (Ranger: 7, Fighter: 1)"

#### Scripts
- **scripts/restructure-skill-points.js**: Created a migration script to automate the YAML restructuring while preserving formatting

### 3. Display Format
Skills now display with the class breakdown inline:
```
Climb +13 Str: 5, Ranks: 8 (Ranger: 7, Fighter: 1)
Tumble +18 Dex: 6, Ranks: 10 (Fighter: 2, Rogue: 9), Jump Synergy: 2
```

### 4. Testing
- All bnb-core tests pass (60 tests)
- Web app displays skills correctly in both streamlined and detailed views
- Backward compatible: simple `ranks: X` format (without breakdown) still works

## Benefits
1. **Consistency**: Follows the same `[total, {breakdown}]` pattern used for abilities, saves, and other calculated fields
2. **Cleaner**: Eliminates the separate `{points: {...}}` object
3. **More Semantic**: The breakdown is directly associated with the ranks field rather than being a separate metadata object
4. **Maintainability**: Easier to understand and work with the data structure

## Migration
To migrate and properly format existing YAML files:

1. Run the restructure script to update the data structure:
```bash
node scripts/restructure-skill-points.js
```

2. Use bnb-cli to apply proper formatting:
```bash
for file in reference_material/beefy_boys_spreadsheets/yaml/*.yaml; do
  pnpm bnb "$file" --write
done
```

The migration:
- Updates skill point structure to nested ranks format
- Applies bnb-core's compact YAML formatting with proper spacing
- Preserves all data and calculated fields
