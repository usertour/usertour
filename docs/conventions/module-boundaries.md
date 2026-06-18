# Module boundaries

Where new code goes. Three rules; everything in `apps/web` and the shared
packages follows them.

## 1. Pure UI primitives → `@usertour/ui`

A component or hook with **zero business types** (doesn't import from
`@usertour/types` other than enums, doesn't touch app contexts, doesn't
call `@usertour/gql` or `@usertour/hooks`'s mutation wrappers) belongs in
`packages/ui/`.

Examples already there: `Button`, `SelectPopover`, `DateTimePicker`,
`LoadingButton`, `NewItemButton`, `EditableTitle`, `TruncatedText`,
`UserAvatar`, `DefaultAvatar`, `ListSkeleton`, `DateRangePicker`, the
`settings/` scaffolding.

If a primitive needs a small utility (e.g. a hash helper) that lives in
the app today, **inline it into the primitive** or move it to
`@usertour/helpers`; don't reach back into `apps/web/...`.

## 2. Multi-app business components → `@usertour/business-components`

If the component imports business types (`Segment`, `Content`,
`IntegrationModel`, etc.) **AND** is used by more than one app (`web`,
`builder`, `extension`), it goes in `packages/business-components/`.

This package may not import from `apps/...`. If a candidate component
needs `apps/web` context (e.g. `useSegmentListContext`), it doesn't
qualify yet — leave it in `apps/web` until the context is also lifted
out.

Examples already there: `Conditions`, `ConditionCombobox`, integration
config cards.

## 3. Web-only business components → `apps/web/src/components/<domain>/`

If a component is business-aware but **only the web app consumes it**,
it lives in the web app's `components/` directory, organised by domain:

```
apps/web/src/components/
  <domain>/             multi-page widgets for this domain
                        (segments/, themes/, sessions/, admin-sidebar/, ...)
  <single-file>.tsx     multi-page widget that doesn't (yet) need a folder
                        (activity-feed.tsx, attribute-type-chip.tsx, ...)
```

Promote a single file to a folder when **the second file in the same
domain appears**. Don't pre-create empty domain folders.

## Page-specific components → `apps/web/src/pages/<route>/components/`

If a component is only used by one route, keep it next to that route.
Don't promote to `apps/web/src/components/` until a second consumer
shows up.

## When to promote

The default is **start local, promote on demand**:

| Currently | Reuse appears at | Move to |
|---|---|---|
| `pages/<route>/components/` | a second route in `apps/web` | `apps/web/src/components/<domain>/` |
| `apps/web/src/components/<domain>/` | builder or extension | `@usertour/business-components` (must first decouple from `apps/web` contexts) |
| anywhere | becomes business-agnostic | `@usertour/ui` |

Don't promote on speculation. Wait for evidence (a second consumer, or
an actual cross-app use case).

## Hooks follow the same axis

- Pure GraphQL wrappers (`useDeleteSegmentMutation` shape, returning
  `{ invoke, loading, error }`) → `packages/hooks/`.
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
