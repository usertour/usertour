# @usertour/conditions

The conditions editor: the `Conditions` component, its condition types and
validators, the element picker it picks targets with, and the two small
domain widgets its condition types render (the attribute data-type icon,
the integration source mark), which the dashboard reuses on its attribute
and segment pages. Shared by the dashboard (`apps/web`) and the content
editor (`packages/editor`).

> Internal workspace package, not published to npm.

## What goes here

Anything that is part of editing or validating a rule's conditions and is
needed by both consumers. The package knows the domain (`@usertour/types`,
one list query from `@usertour/data`) but not the application: no router, no
environment values, and no copy — the consumer passes `t` in.

## What does NOT go here

- A generic primitive with no domain knowledge → `@usertour/ui`.
- A component only one consumer uses → that consumer, next to its callers.
- A hook over a GraphQL document → `@usertour/data`.

## Development

```bash
pnpm typecheck    # tsc --noEmit
pnpm build        # tsup, with type declarations
```
