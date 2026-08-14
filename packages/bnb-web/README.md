# bnb-web

> Web interface for BeefBrain character management

**Status**: 🚧 Working prototype, needs refactoring

## Overview

A SvelteKit web application for viewing and managing TTRPG characters stored in YAML files. Provides multiple views optimized for different use cases (streamlined for gameplay, detailed for planning, DM-only tools).

**Critical Issue**: Currently does NOT use bnb-core library. Integration is the top priority.

## Features

### ✅ Implemented

- **Character List**: Browse all available characters
- **Character Sheets**: 
  - Streamlined view (combat-focused)
  - Detailed view (complete stats)
- **Inventory Management**: 
  - View character equipment
  - CSV export for spreadsheet analysis
  - Weight/value calculations
- **DM Tools**:
  - Loot metadata management
  - Campaign item tracking
- **Responsive Design**: Works on desktop and mobile

### ❌ Missing (Critical)

- bnb-core integration
- Validation feedback
- Automatic calculations
- Character editing
- File upload/download

### 📋 Planned (Key Features)

**Editing & Git Integration:**
- In-browser character editing with YAML export for version control
- File upload/download (Git-friendly workflows)

**Live Gameplay:**
- Equip/unequip items with live recalculation (encumbrance, AC, attack bonuses)
- Temporary effect system (buff spells, wild shape, conditions)
- Real-time stat updates during gameplay

**Campaign Management:**
- GUID-based sharing (DM view + individual player views)
- Multi-party support for multiple campaigns
- Player-specific visibility controls

**Advanced:**
- Schema selection (D&D 3.5e vs M&M 3e)
- Print-friendly character sheets
- Mobile-optimized gameplay interface

## Development

### Quick Start

```bash
# From repository root
pnpm dev

# Or from package directory
cd packages/bnb-web
pnpm dev
```

Dev server runs at `http://localhost:5173` (accessible from host machine in dev container)

### Project Structure

```
src/
├── routes/
│   ├── +page.svelte              # Character list
│   ├── characters/
│   │   └── [slug]/+page.svelte   # Individual character
│   ├── dm/                       # DM-only pages
│   └── demo/                     # Test pages
├── lib/
│   ├── components/               # Reusable components
│   │   ├── StreamlinedSheet.svelte
│   │   ├── DetailedSheet.svelte
│   │   └── InventorySection.svelte
│   ├── server/                   # Server-side modules
│   │   ├── characters.ts         # Character data loading
│   │   └── dmMetadata.ts         # DM metadata
│   ├── format.ts                 # Display formatting
│   ├── inventory.ts              # Inventory logic
│   └── csvExport.ts              # CSV generation
└── app.html                      # HTML template
```

## Testing

### Unit Tests (Vitest)

```bash
pnpm test:unit        # Run once
pnpm test:unit:watch  # Watch mode (via vitest directly)
```

Example tests exist in `src/lib/vitest-examples/`

**Needs**: Comprehensive component and utility tests

### E2E Tests (Playwright)

```bash
pnpm test:e2e         # Run all e2e tests
```

Basic Playwright setup exists. Example test in `src/routes/demo/playwright/`

**Needs**: Full workflow coverage

### Run All Tests

```bash
pnpm test  # Runs unit tests + e2e tests
```

## Building

```bash
pnpm build       # Build for production
pnpm preview     # Preview production build
```

## Current Architecture Issues

### 🚨 Critical: Not Using bnb-core

**Problem**: The web app currently:
- Parses YAML directly with `js-yaml`
- Has no validation logic
- Doesn't calculate derived fields
- Duplicates logic that exists in bnb-core

**Solution**: Integrate bnb-core

```typescript
// Current (bad)
import yaml from 'js-yaml';
const data = yaml.load(raw);

// Should be (good)
import { validateBeefBrainData, updateCalculatedFields } from 'bnb-core';
if (!validateBeefBrainData(raw)) {
  // Show validation errors
}
const calculated = updateCalculatedFields(raw);
const data = yaml.load(calculated);
```

### Missing Dependency

`package.json` should include:
```json
{
  "dependencies": {
    "bnb-core": "workspace:*",
    "js-yaml": "^4.1.1"
  }
}
```

## Planned Architecture for Key Features

### GUID-Based Character Sharing (Static Site)

**Approach**: Client-side only, no backend required

```
Campaign Structure:
/data/
  ├── campaign-abc123.json          # Campaign metadata + GUID mappings
  ├── character-guid1.yaml          # Character files
  ├── character-guid2.yaml
  └── inventory-shared.yaml         # Shared party inventory

URL Structure:
- /dm/abc123                        # DM view (all characters + full inventory)
- /character/guid1                  # Player view (single character)
- /character/guid2                  # Another player's view

GUID Generation:
- Generate at "export campaign" time
- Store GUID→character mappings in campaign JSON
- GUIDs are v4 UUIDs (cryptographically random)
- No server = no brute force attacks possible
```

**Implementation**:
- SvelteKit static adapter (prerendered or SPA mode)
- Campaign files stored in `static/campaigns/` or loaded dynamically
- Route params `[guid]` load appropriate character data
- No authentication needed (security through obscurity + random GUIDs)

### Temporary Effects System

**Approach**: Client-side effect application with bnb-core integration

```typescript
// Effect definition
interface Effect {
  id: string;
  name: string;
  description: string;
  modifiers: {
    [stat: string]: number;  // e.g., { strength: 4, attack: 2 }
  };
  duration?: {
    type: 'rounds' | 'minutes' | 'hours';
    value: number;
  };
  category: 'spell' | 'ability' | 'condition' | 'equipment';
}

// Common buff presets
const COMMON_BUFFS: Effect[] = [
  {
    id: 'bulls-strength',
    name: "Bull's Strength",
    modifiers: { strength: 4 },
    duration: { type: 'minutes', value: 10 }
  },
  {
    id: 'wild-shape-polar-bear',
    name: 'Wild Shape: Polar Bear',
    modifiers: {
      strength: 16,  // Replace base
      dexterity: -2,
      constitution: 8,
      naturalArmor: 5,
      // ... full stat replacement
    }
  }
];

// Application
function applyEffect(character: Character, effect: Effect): Character {
  // Clone character data
  const modified = { ...character };
  
  // Apply modifiers
  for (const [stat, value] of Object.entries(effect.modifiers)) {
    // Use bnb-core to recalculate derived stats
    // This needs bnb-core API: applyModifier()
  }
  
  return modified;
}
```

**Storage**:
- Active effects stored in browser localStorage (per-session)
- Effects NOT saved to YAML (temporary by definition)
- Option to "make permanent" by adding to character YAML

### Equip/Unequip System

**Approach**: Toggle equipment status with live recalc

```typescript
interface InventoryItem {
  name: string;
  weight: number;
  value: number;
  status: 'worn' | 'carried' | 'stored';  // Add status field
  bonuses?: {
    ac?: number;
    attack?: number;
    damage?: string;
    // ... other bonuses
  };
}

function calculateEncumbrance(character: Character): {
  current: number;
  light: number;
  medium: number;
  heavy: number;
  status: 'light' | 'medium' | 'heavy' | 'overloaded';
} {
  const str = character.abilities.strength[0];
  const carriedWeight = character.inventory
    .filter(i => i.status === 'worn' || i.status === 'carried')
    .reduce((sum, i) => sum + i.weight, 0);
  
  // D&D 3.5e encumbrance rules
  const light = str * 5;
  const medium = str * 10;
  const heavy = str * 15;
  
  return {
    current: carriedWeight,
    light, medium, heavy,
    status: carriedWeight <= light ? 'light'
          : carriedWeight <= medium ? 'medium'
          : carriedWeight <= heavy ? 'heavy'
          : 'overloaded'
  };
}

function calculateAC(character: Character): {
  total: number;
  breakdown: Record<string, number>;
} {
  const base = 10;
  const dex = character.abilities.dexterity[1].dex;
  
  // Find equipped armor and shield
  const armor = character.inventory.find(i => 
    i.status === 'worn' && i.bonuses?.ac && i.type === 'armor'
  );
  const shield = character.inventory.find(i => 
    i.status === 'worn' && i.bonuses?.ac && i.type === 'shield'
  );
  
  return {
    total: base + dex + (armor?.bonuses?.ac ?? 0) + (shield?.bonuses?.ac ?? 0),
    breakdown: {
      base,
      dex,
      armor: armor?.bonuses?.ac ?? 0,
      shield: shield?.bonuses?.ac ?? 0
    }
  };
}
```

### Multi-Party Support

**Approach**: Campaign files as data containers

```
File Structure:
/static/campaigns/
  ├── campaign-1/
  │   ├── metadata.json          # { id, name, dmGuid, parties: [...] }
  │   ├── party-1/
  │   │   ├── character-1.yaml
  │   │   ├── character-2.yaml
  │   │   └── inventory.yaml
  │   └── party-2/
  │       ├── character-3.yaml
  │       └── inventory.yaml
  └── campaign-2/
      └── ...

Campaign Switcher UI:
- Dropdown in nav: "Active Campaign: [Black Stag]"
- Switch updates localStorage currentCampaign
- All routes filter to current campaign
- Import/export full campaign as ZIP
```

## Next Steps (Priority Order)

### Phase 1: Foundation (High Priority) 🚧

**Goal**: Integrate bnb-core and establish solid foundation for editing features

1. **Add bnb-core dependency** to package.json
2. **Integrate validation** in character loading
   - Show validation errors in UI
   - Prevent loading invalid character data
3. **Use calculation engine** for derived fields
   - Replace manual calculations with bnb-core
   - Ensure consistency with CLI tool
4. **Add validation feedback** in UI
   - Inline error messages
   - Field-level validation hints
5. **Add test coverage** for existing components
   - Component tests for character sheets
   - Integration tests for data loading

### Phase 2: In-Browser Editing & YAML Export 📝

**Goal**: Enable character editing with Git-friendly workflows

6. **Character editing UI**
   - Edit ability scores, skills, feats, etc.
   - Form validation with real-time feedback
   - Undo/redo functionality
7. **YAML file download/export**
   - Export edited character as `.yaml` file
   - Preserve formatting and comments
   - Ready for Git commit
8. **File upload functionality**
   - Drag-and-drop YAML upload
   - Multi-file upload for campaign management
9. **Basic inventory management**
   - Add/remove items
   - Edit item properties (weight, value, description)
   - Bulk operations (sort, filter, search)

### Phase 3: Live Gameplay Features ⚔️

**Goal**: Real-time character updates during game sessions

10. **Equip/unequip system**
    - Toggle equipment status (worn/carried/stored)
    - Live recalculation of encumbrance (light/medium/heavy load)
    - Live recalculation of AC (armor, shield, dex bonus)
    - Live recalculation of attack bonuses (weapon proficiencies)
    - Visual indicators for encumbrance status
11. **Temporary effects system**
    - Create effect templates (buffs, debuffs, conditions)
    - Toggle effects on/off for characters
    - Effect presets for common spells:
      - Bull's Strength, Cat's Grace, etc.
      - Bless, Prayer, Haste
      - Druid wild shape forms (e.g., Polar Bear)
    - Custom effect builder
    - Effect duration tracking (rounds/minutes/hours)
    - Show active effects on character sheet
12. **Live calculation preview**
    - Real-time stat updates as effects are toggled
    - "Before/After" comparison view
    - Calculation breakdown tooltips
13. **Combat-focused quick view**
    - Initiative tracker integration
    - HP tracking with temporary HP
    - Condition markers (prone, stunned, etc.)

### Phase 4: Multi-User & Campaign Management 🎲

**Goal**: Support multiple parties and secure character sharing

14. **GUID-based character access**
    - Generate unique GUIDs for each character
    - Generate unique GUID for DM view (all characters + full inventory)
    - Static site with client-side routing (no auth required)
    - URL structure: `/character/<guid>`, `/dm/<campaign-guid>`
15. **Multi-party support**
    - Create/manage multiple campaigns/parties
    - Switch between active campaigns
    - Import/export campaign data
    - Per-campaign inventory/loot tracking
16. **Player-specific views**
    - Player sees only their character(s)
    - Player sees shared party inventory (player knowledge)
    - DM sees all characters + DM-only notes/items
    - Configurable visibility per item/note
17. **Shareable links**
    - Copy link to clipboard for easy sharing
    - QR code generation for mobile access
    - Bookmark-friendly URLs
18. **Campaign data management**
    - Export entire campaign (all characters + metadata)
    - Import campaign from ZIP/folder
    - Sync with Git repository (advanced)

### Phase 5: Polish & Production 🚀

**Goal**: Production-ready deployment with excellent UX

19. **Performance optimization**
    - Lazy loading for large campaigns
    - Virtual scrolling for long item lists
    - Optimistic UI updates
20. **Enhanced mobile experience**
    - Touch-optimized controls for effects/inventory
    - Swipe gestures for common actions
    - Offline support with service workers
21. **Advanced features**
    - Schema selection UI (D&D 3.5e / M&M 3e)
    - Character comparison view
    - Print-friendly character sheets
    - CSV export for inventory/loot
    - Search across all characters in campaign
22. **Production deployment**
    - SEO and meta tags
    - Analytics integration
    - Error tracking (Sentry)
    - Deploy to static hosting (Vercel/Netlify)
    - CI/CD pipeline for automated testing/deployment

## Tech Stack

- **SvelteKit**: Web framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Vitest**: Unit testing
- **Playwright**: E2E testing
- **ESLint + Prettier**: Code quality

## Contributing

When adding features:
1. Use bnb-core for all character data operations
2. Add component tests with Vitest
3. Add e2e tests for workflows with Playwright
4. Follow existing component patterns
5. Test on both desktop and mobile

## License

MIT
