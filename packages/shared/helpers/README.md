# @usertour/helpers

Utility functions and helpers shared across the UserTour project.

## Installation

```bash
npm install @usertour/helpers
```

## Usage

```typescript
import { generateId, mergeDeep, formatColor } from '@usertour/helpers';

// Generate unique IDs
const id = generateId();

// Deep merge objects
const merged = mergeDeep(obj1, obj2);

// Format colors
const formattedColor = formatColor('#ff0000');
```

## Available Utilities

This package provides various utility functions for the UserTour project:

- **ID Generation**: Unique ID generation with cuid2
- **Object Utilities**: Deep merging, equality checking
- **Color Utilities**: Color formatting and manipulation with chroma-js
- **Type Utilities**: Type-safe utility functions
- **Validation**: Input validation helpers
- **Formatting**: Data formatting utilities

## Dependencies

This package depends on:
- `@usertour-packages/types` - TypeScript type definitions
- `fast-deep-equal` - Deep equality checking
- `chroma-js` - Color manipulation
- `deepmerge-ts` - Type-safe deep merging
- `@paralleldrive/cuid2` - Unique ID generation
- `class-variance-authority` - Class name variants
- `uuid` - UUID generation

## Development

This package is part of the UserTour monorepo. For development:

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Watch for changes
pnpm dev
```

## License

AGPL-3.0 