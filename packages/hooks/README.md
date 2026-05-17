# @usertour/hooks

GraphQL data-access hooks for the UserTour monorepo.

> **Note**: Internal workspace package, not published to npm.

The architectural _why_ (boundary, rejected alternatives, triggers to revisit) lives in [`docs/adr/0002-hook-domain-boundary.md`](../../docs/adr/0002-hook-domain-boundary.md). This README is the daily-use cheat sheet.

## What goes here

1. **Apollo wrappers** for GraphQL `DocumentNode`s from `@usertour/gql`. Each wrapper calls `useQuery` / `useMutation` / `useLazyQuery`, decodes the nested response shape, and returns a uniform signature:
   - **Queries** → `{ data, loading, error, refetch }`
   - **Mutations** → `{ invoke, loading, error }` where `invoke(args)` resolves with the unwrapped result
2. **Cross-app React utilities** that depend only on React and on the wrappers above. Examples: `useDetectExtension`, `useTooltipTargetMissingSessions`.

## What does NOT go here

Anything that depends on the consuming app. Hard rules:

- ❌ `react-router-dom` (or any router) — routing belongs to the consumer
- ❌ App-specific environment values (`apiUrl`, `posthogKey`, etc.)
- ❌ App-specific URL string contracts (`/auth/2fa`, `?next=`, `/api/auth/${provider}`)
- ❌ UI components, styling decisions, or business chrome

| If the helper… | …it lives in |
|---|---|
| depends on `react-router-dom` or app URL strings | `apps/<app>/src/...` next to its callers |
| is a UI primitive with no business knowledge | `@usertour/ui` (`packages/components/ui`) |
| is a business UI component shared across 2+ apps | `@usertour/business-components` |
| is a hook scoped to one feature in one app | `apps/<app>/src/pages/<feature>/components/` |

## Adding a new hook — decision tree

```
Is the helper an Apollo wrapper for a GraphQL DocumentNode?
├─ YES — which domain does it belong to?
│   ├─ Domain file already exists → add to hooks/<domain>.ts
│   └─ Domain file does not exist
│       ├─ ≥5 same-domain hooks already piled in gql.ts
│       │     → create hooks/<domain>.ts, migrate all same-domain hooks together
│       │       (re-export from src/index.ts; do not change public API)
│       └─ <5 → append to gql.ts for now, mark "// TODO domain split"
│
└─ NO — is it a cross-app React utility (no router, no app env, no UI)?
    ├─ YES → its own file `hooks/use-<name>.ts`, re-export explicitly from src/index.ts
    └─ NO  → does not belong in this package; return to the consuming app
```

The "5-hook threshold" is a rule of thumb, not a hard limit. The intent is: don't create a 30-line domain file for a single mutation, and don't append the 6th auth hook to a 1300-line catch-all. Use judgment near the boundary.

## Current domain files

| File | Domain |
|---|---|
| `hooks/auth.ts` | Login, sign-up (magic-link + invite + setup-admin), password reset, invite query, logout, current user, 2FA setup / verify / disable / regenerate |
| `hooks/gql.ts` | **Transitional bucket.** Content / users / companies / segments / themes / billing / integrations / system-admin / etc., all undifferentiated. New hooks for these domains may still land here until the domain is extracted. |

When a new domain is extracted from `gql.ts`, add a row here and update [ADR 0002](../../docs/adr/0002-hook-domain-boundary.md)'s implementation-reference section.

## House rules

- **Naming.** `useXxxQuery` for queries, `useXxxMutation` for mutations, `useXxxLazyQuery` for `useLazyQuery`. The verb matches the underlying Apollo hook so consumers can predict the return shape.
- **Variables types.** When a mutation takes more than 2 positional arguments, declare a `XxxMutationVariables` type next to the hook and export it.
- **Return shape.** Stick to `{ data, loading, error, refetch }` for queries and `{ invoke, loading, error }` for mutations. Resist the temptation to expose `mutate` (Apollo's tuple form) directly — the whole point of this layer is to absorb that shape.
- **Type casts.** When Apollo's response type is too loose (`as Foo`, `as Foo | undefined`), do the cast inside the wrapper so callers see a typed result. Casts at callsites are a smell that the wrapper isn't doing its job.
- **No side effects in wrappers.** The wrapper decodes and returns; it does not navigate, toast, or refetch sibling queries. Those decisions belong to the caller. The one exception in this package is `useInvalidateLicenseScopedCache`, which exists specifically to mutate Apollo cache after admin operations — and it's documented as such.

## Development

```bash
pnpm build        # build with type declarations
pnpm dev          # watch mode
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest
```

## License

MIT
