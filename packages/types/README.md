# @usertour/types

TypeScript type definitions and enums shared across the UserTour project.

> **Note**: This is an internal workspace package and is not published to npm.

## Usage

This package is available to other packages in the monorepo via workspace dependencies:

```json
{
  "dependencies": {
    "@usertour/types": "workspace:^"
  }
}
```

```typescript
import { UserTourTypes } from '@usertour/types';

// Use the types in your TypeScript code
const tourConfig: UserTourTypes.TourConfig = {
  // your tour configuration
};
```

## Available Types

This package exports various TypeScript types for the UserTour project:

- **Content Types**: Tour content, steps, modals, and flow configurations
- **Theme Types**: UI themes, colors, and styling configurations  
- **Event Types**: User interaction events and analytics
- **Project Types**: Project and environment management
- **User Types**: User profiles and authentication
- **SDK Types**: SDK configuration and session management
- **Team Types**: Team member roles and permissions
- **Subscription Types**: Billing and plan management
- **Integration Types**: Third-party integrations (Salesforce, etc.)
- **Statistics Types**: Analytics and reporting data structures

## Development

```bash
# Build the package
pnpm build

# Watch for changes
pnpm dev
```

## License

AGPL-3.0
