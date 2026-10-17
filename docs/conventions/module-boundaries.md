# Module boundaries

Where new code goes. Two rules; everything in `apps/web` and the shared
packages follows them. The server has its own layering — see
[Server](#server-appsserver) at the end.

## 1. Pure UI primitives → `@usertour/ui`

A component or hook with **zero business types** (doesn't import from
`@usertour/types` other than enums, doesn't touch app contexts, doesn't
call `@usertour/data`'s documents or mutation wrappers) belongs in
`packages/ui/`.

Examples already there: `Button`, `SelectPopover`, `DateTimePicker`,
`LoadingButton`, `NewItemButton`, `EditableTitle`, `TruncatedText`,
`UserAvatar`, `DefaultAvatar`, `ListSkeleton`, `DateRangePicker`, the
`settings/` scaffolding.

If a primitive needs a small utility (e.g. a hash helper) that lives in
the app today, **inline it into the primitive** or move it to
`@usertour/helpers`; don't reach back into `apps/web/...`.

## 2. Business components → `apps/web/src/components/<domain>/`

A business-aware component has one consumer, the web app, so it lives in
the web app's `components/` directory, organised by domain:

```
apps/web/src/components/
  <domain>/             multi-page widgets for this domain
                        (segments/, themes/, sessions/, admin-sidebar/,
                         editor/, conditions/, element-picker/, ...)
  <single-file>.tsx     multi-page widget that doesn't (yet) need a folder
                        (activity-feed.tsx, ...)
```

Promote a single file to a folder when **the second file in the same
domain appears**. Don't pre-create empty domain folders.

This is also where the content editor (`editor/`) and the conditions
editor (`conditions/`) live. They were workspace packages until 2026-10;
with the plugin plans gone they had no consumer but the web app, and a
package boundary with one consumer only costs. A business component
becomes a package again when a second consumer outside `apps/web` exists
— not on speculation.

## Page-specific components → `apps/web/src/pages/<route>/components/`

If a component is only used by one route, keep it next to that route.
Don't promote to `apps/web/src/components/` until a second consumer
shows up.

## When to promote

The default is **start local, promote on demand**:

| Currently | Reuse appears at | Move to |
|---|---|---|
| `pages/<route>/components/` | a second route in `apps/web` | `apps/web/src/components/<domain>/` |
| `apps/web/src/components/<domain>/` | a consumer outside `apps/web` | a new workspace package (must first decouple from `apps/web` contexts) |
| anywhere | becomes business-agnostic | `@usertour/ui` |

Don't promote on speculation. Wait for evidence (a second consumer, or
an actual cross-app use case).

## Hooks follow the same axis

- Pure GraphQL wrappers (`useDeleteSegmentMutation` shape, returning
  `{ invoke, loading, error }`) → `packages/data/`.
- Anything that touches `useToast`, an app context, `useNavigate`, or
  wraps a GraphQL hook with UX behaviour → `apps/web/src/hooks/`.

## What's deliberately NOT here

- No `atoms/` / `molecules/` / `templates/` layering. Atomic Design's
  naming carried no real distinction in this codebase — domain folders
  do the work that "molecules" was supposed to.
- No `apps/web/src/components/shared/`. The semantic ("multi-page
  shared") is carried by *being in `apps/web/src/components/` at all*
  — single-page code lives next to its page, so anything at the
  app-level `components/` is already shared.

## Server (`apps/server`)

Two layers, decided in [ADR 0015](../adr/0015-server-layering.md):

- **entrypoints** — REST v2 (`api/`), REST v1 (`openapi/`), MCP (`mcp/`),
  the websocket gateways. Parse, map to the wire format, translate errors.
- **modules** — everything else, business and infrastructure alike, each
  module with its services and its thin GraphQL adapter (resolver,
  `dtos/`) side by side.

Imports only point one way: entrypoints → modules. A rule belongs in a
module when every entrypoint should obey it. New modules go in
`src/modules/<module>/`; existing ones move there when they are next
substantially changed. Inside a module:

```
<module>.module.ts · <module>.resolver.ts
dtos/        *.input.ts, *.dto.ts   (GraphQL only; object types are
                                     @ObjectType('X') class XDTO)
services/    *.service.ts           take plain types from types/, never dtos/
types/       *.type.ts
utils/       *.util.ts
constants/   *.constant.ts
```

One export per file, named after it. `src/modules/localizations/` is the
reference module.

`apps/server/src/layering.spec.ts` enforces the direction and holds the
layer map — which is also the record of what has been migrated.
