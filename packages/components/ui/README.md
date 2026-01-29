# @usertour-packages/ui

Unified UI components package for Usertour.

## Structure

All UI components are placed directly in the `src/ui/` directory, following the shadcn/ui pattern:

```
src/
  ├── ui/
  │   ├── button.tsx
  │   ├── dialog.tsx
  │   └── ... (other components)
  └── index.ts
```

## Adding New Components

1. Create a new component file in `src/ui/` (e.g., `src/ui/my-component.tsx`)
2. Export the component from `src/index.ts`:

```typescript
export * from './ui/my-component';
```

## Usage

Import components from the package:

```typescript
import { MyComponent } from '@usertour-packages/ui';
```
