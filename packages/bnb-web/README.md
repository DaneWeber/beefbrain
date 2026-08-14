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

### 📋 Planned

- Character editing interface
- Live calculation preview
- Schema selection (D&D 3.5e vs M&M 3e)
- Authentication for DM features
- Real-time collaboration

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

## Next Steps (Priority Order)

### Phase 1: Foundation (High Priority)

1. **Add bnb-core dependency** to package.json
2. **Integrate validation** in character loading
3. **Use calculation engine** for derived fields
4. **Add validation feedback** in UI
5. **Add test coverage** for existing components

### Phase 2: Core Features

6. Implement character editing
7. Add file upload/download
8. Add live calculation preview
9. Comprehensive e2e tests

### Phase 3: Enhanced Features

10. Schema selection UI (D&D 3.5e / M&M 3e)
11. Authentication for DM features
12. Improved mobile experience
13. Character comparison view
14. Print-friendly character sheets

### Phase 4: Production

15. Performance optimization
16. SEO and meta tags
17. Analytics integration
18. Deploy to production
19. CI/CD pipeline

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
