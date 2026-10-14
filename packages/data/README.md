# @usertour/data

GraphQL data-access hooks for the Usertour monorepo.

> **Note**: Internal workspace package, not published to npm.

The architectural _why_ (boundary, rejected alternatives, triggers to revisit) lives in [`docs/adr/0002-hook-domain-boundary.md`](../../docs/adr/0002-hook-domain-boundary.md). This README is the daily-use cheat sheet.

## What goes here

1. **Apollo wrappers** for the GraphQL documents generated into `src/generated` from the `.graphql` files in `src/documents`, named after the entity or the hook module that owns them (a document named like a module in `src/hooks` is that module's). Each wrapper calls `useQuery` / `useMutation` / `useLazyQuery`, decodes the nested response shape, and returns a uniform signature:
   - **Queries** → `{ data, loading, error, refetch }`
   - **Mutations** → `{ invoke, loading, error }` where `invoke(args)` resolves with the unwrapped result
2. **Cross-app React utilities** that depend only on React and on the wrappers above. Example: `useTooltipTargetMissingSessions`.

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
| is a business UI component (the editor and the conditions editor included) | `apps/web/src/components/<domain>/` |
| is a hook scoped to one feature in one app | `apps/<app>/src/pages/<feature>/components/` |

## Adding a new hook — decision tree

```
Is the helper an Apollo wrapper for a GraphQL DocumentNode?
├─ YES — which domain does it belong to?
│   ├─ Domain module already exists → add to hooks/<domain>.ts, its
│   │  operation to documents/<domain>.graphql
│   └─ Domain module does not exist → create both, named alike
│       (`export *` it from src/index.ts; the public API is the union)
│
└─ NO — is it a cross-app React utility (no router, no app env, no UI)?
    ├─ YES → its own file `hooks/use-<name>.ts`, re-export explicitly from src/index.ts
    └─ NO  → does not belong in this package; return to the consuming app
```

A module for a single mutation is fine: the unit is the domain, not the line count.

## Current domain files

A module with a document of its name under `src/documents` owns that document; a document named after an entity is shared by the modules of that entity.

| File | Domain |
|---|---|
| `hooks/access-tokens.ts` | Environment access tokens |
| `hooks/account.ts` | The signed-in user's profile, email and password |
| `hooks/activity-feed.ts` | A user's or company's event feed |
| `hooks/admin.ts` | System administration: instance settings, users, projects |
| `hooks/analytics.ts` | Content analytics, question analytics, tracker users (page and export) |
| `hooks/api-tokens.ts` | Personal API tokens |
| `hooks/attributes.ts` | Attribute definitions |
| `hooks/audit-logs.ts` | Audit log |
| `hooks/auth.ts` | Login, sign-up (magic-link + invite + setup-admin), password reset, invite query, logout, current user, SSO login lookup, 2FA setup / verify / disable / regenerate, refreshing `me` |
| `hooks/biz.ts` | An environment's users and companies |
| `hooks/content.ts` | Contents, versions, publish records, the builder's content list and version writes |
| `hooks/environments.ts` | Environments and the installation check |
| `hooks/events.ts` | Event definitions |
| `hooks/identity-verification.ts` | Identity verification settings |
| `hooks/integrations.ts` | Integrations and their object mappings |
| `hooks/localizations.ts` | Localizations and version translations |
| `hooks/oauth-connections.ts` | Connected OAuth apps |
| `hooks/outbound-message.ts` | Outbound messages |
| `hooks/project.ts` | The project's settings, config and license |
| `hooks/references.ts` | Definition references (what a deletion would break) |
| `hooks/segments.ts` | Segments and segment membership |
| `hooks/sessions.ts` | Sessions: list, detail, export rows, end and delete |
| `hooks/sso.ts` | SSO providers and the project's SSO settings |
| `hooks/storage.ts` | Presigned upload URLs |
| `hooks/subscription.ts` | Billing sessions and the subscription |
| `hooks/team.ts` | Members, invites and the active project |
| `hooks/themes.ts` | Themes |
| `hooks/utilities.ts` | The deployment's public configuration, oEmbed lookup |
| `hooks/webhooks.ts` | Webhooks |

Cross-cutting hooks that read no document of their own (`use-content-count`, `use-current-user-id`, `use-cursor-fetch-more`, `use-tooltip-target-missing-sessions`, `use-invalidate-license-scoped-cache`) live beside the modules as `hooks/use-<name>.ts`. When a new domain module is added, add a row here.

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

After editing a `.graphql` file, regenerate the contract from the repo root
(it emits the server's schema first, then runs the generator here):

```bash
pnpm gql:generate
```

CI fails when the committed `src/generated` is stale.

## License

MIT
