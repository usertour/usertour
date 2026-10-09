# 0021: Typed GraphQL documents and one query layer for the dashboard

- **Date:** 2026-10-09
- **Status:** Accepted

## Context

The dashboard (`apps/web`) talks to the server through GraphQL, and the path from a server response to a rendered component is built by hand at every step.

**The contract is transcribed, not generated.** `packages/gql` holds 190 hand-written documents across 27 files; `packages/hooks` wraps them in 183 hand-written hooks; the result shapes are hand-maintained TypeScript types in `@usertour/types`. No document carries a result type (`TypedDocumentNode` appears nowhere in the repository). What the schema says about nullability and shape never reaches the type checker: `UserProfile` does not even declare the `projects` array the `me` query returns, and a comment next to the access calls it "pragmatic loose access". The gap is papered over at the call sites — 26 `as unknown as` casts and 35 `Record<string, unknown>` reads in `apps/web/src`.

**Query state is decided per component.** The Apollo client sets `errorPolicy: 'all'` for every query, so a partially successful response is handed on as data. Each page then combines `loading`, `data` and `error` on its own: 38 `if (loading)` gates, 21 `loading && !data` guards (a rule people have to remember, because a broadcast refetch flips `loading` on a query that still has data), and the near-universal `list ?? []`. 157 hooks return `error`; 3 call sites read it. The effect is that a failed query renders as an **empty state** — "No events yet" — with no sign that anything failed. Mutations are the exception: 74 `try { … } catch { toast(getErrorMessage(error)) }` sites make their failures visible, by copy and paste.

**The error link knows two codes.** `E0011` refreshes the session or redirects to sign-in; `E0013` reloads the app. Every other GraphQL error passes through unclassified and unreported; network errors go to `console.error`.

On 2026-10-08 a connection-pool exhaustion made these three gaps compound. `me.projects` is a nullable field resolved by its own query; it failed while the rest of `me` succeeded; the partial result was handed on; the hand-written mapping read `null` as `[]`; the admin shell concluded the user had no project and sent them to the **create-project** form — a form that would really have created one. The same failure, caught by a different observer of the same query, read as "signed out". PR #544 fixed that one query by hand: a three-state list (unknown / empty / known), a cache merge that keeps a known list when a later delivery is `null`, and a retry view. Nothing stops the next query from failing the same way, because the rule lives in one place and the other 150 queries do not share it.

Over the 90 days before this decision, commits touching `apps/web` split 87 `fix` to 62 `feat`. Most of the fixes are interest on these three gaps.

We studied the data layer of a large open-source React product with the same stack. Its documents are generated with result types from the schema; all record queries flow through one hook, where a failed query is logged and surfaced to the user exactly once; its Apollo error link classifies errors (expected business codes stay quiet, the rest are reported) rather than announcing them; and it mounts error boundaries per layout region rather than once at the root. It does not distinguish an error from an empty list in place — a failed table is an empty table plus a notification — which is enough where the empty state is a sentence and not enough where the empty state is an action, as `/select-project` showed.

## Decision

### 1. Documents are generated with their result types

GraphQL Code Generator runs in `packages/gql` with the `typescript`, `typescript-operations` and `typed-document-node` plugins, reading `apps/server/src/schema.graphql` and the operation files under `packages/gql/src`, and writing `packages/gql/src/generated/graphql.ts`. Every operation becomes a `TypedDocumentNode<Result, Variables>`; `useQuery` and `useMutation` infer both from it. CI regenerates and fails on a diff, so a schema change that is not reflected in the generated file cannot merge.

No React hooks are generated. Hooks are where the rules of §2 live; generating one hook per operation would reinstate 183 places to decide query state.

### 2. One query layer decides loading, error, empty and ready

A small set of generic hooks in `@usertour/hooks` — a list hook and a detail hook, taking a typed document, its variables and a few options — is the only way a page reads from the server. ADR 0002 already names that package the GraphQL data-access layer; this ADR replaces the per-operation wrappers it describes with these generic hooks, and replaces their uniform `{ data, loading, error, refetch }` signature with one discriminated state:

| State | Meaning | Decided by |
|---|---|---|
| `loading` | no data yet | `loading && data === undefined` |
| `error` | the server did not answer, in whole or in part | any GraphQL or network error; carries `retry` |
| `empty` | the server answered with nothing | a delivered empty list or a delivered `null` |
| `ready` | data, with a `refreshing` flag while a refetch is in flight | everything else |

The rules live here once: the `loading && !data` guard is the layer's definition of loading, not a convention; `errorPolicy` is `none` for a query unless it opts into `'all'` explicitly, so a partial response is an error and never flows as data; a failed query is logged and surfaced to the user once, with the operation named, unless the caller passes `onError` to take over; `empty` exists only when the server delivered emptiness. Surfacing an error needs a toast and translated copy, which the shared package does not import: the layer takes a notifier from a provider the application mounts (`apps/web` supplies its toast and `t`), and logs when none is mounted. `packages/business-components` and `packages/editor` consume the hooks package too and get the same layer through the same provider.

The app-wide `errorPolicy` default flips from `'all'` to `'none'` when the first slice of §3 lands. Hooks not yet migrated then receive `data: undefined` plus `error` on failure — the same empty rendering they produce today — but partial data stops flowing as truth from that point on.

### 3. Migration is by slice, and it is one migration, not two

Each slice replaces a group of hand-written documents with generated ones **and** rewrites their hooks onto the layer of §2 in the same pull request, deleting the hand-written hooks and the hand-maintained result types they needed. Order: `me` and authentication; the settings lists (events, attributes, environments, localizations, themes, members, tokens, webhooks, integrations); users, companies and segments; content and the builder. Each slice must leave `tsc` green with no behaviour change beyond failures becoming visible. Progress is measured by the counts in Context: casts, `?? []` reads, hand-written hooks.

### 4. The error link classifies and reports; it does not announce

The link keeps its session handling (`E0011`, `E0013`). Expected business codes — validation, permission, not-found, conflict, rate limit, the `E1xxx` family — pass through silently for the layer or the mutation site to present. Everything else is captured to PostHog with a fingerprint of error code and operation name. A network error is surfaced once through the same notifier the layer uses, de-duplicated. The link never shows a query error itself: it has no context beyond the operation name, and a notice raised there would have to move again once §2 exists.

### 5. In-place error states only where the empty state is an action or gates the shell

Three queries render an error state in place rather than a notification: `me` (done in #544; its three-state mapping, `keepKnownList` merge and `refetchWritePolicy: 'merge'` are the pattern), the environment list, and content detail with its version (the builder's input). They share one card presentation with the auth backdrop (`ProjectsUnavailable` is its first instance). Every other query is served by the layer's notification plus the page's ordinary empty state.

### 6. Error boundaries per region

Two boundaries join the root one: around the admin layout's content area, and around the builder's panel. A crash in a settings page or a builder panel leaves the sidebar and the other panels standing.

### Out of scope

Making the URL the single source of truth for the active project and environment (the server-side `actived` flag, the `localStorage` fallback and the four-step environment selection) is a routing decision with its own ADR. Rewriting pages onto a boundary component (`<QueryBoundary state={…}>`) is not done: the layer gives every page the same guarantees without touching it.

## Consequences

- A schema change that affects a selected field is a compile error in the dashboard, not a runtime surprise. Nullability in particular becomes visible: `data.me.projects` is `Array | null` to the type checker, and `?? []` has to be written knowingly.
- A failed query is seen — once, named — instead of rendering as nothing. The three queries of §5 fail in place with a retry.
- The guards and casts in Context disappear as slices land; `packages/hooks` shrinks to the mutation wrappers and whatever has not migrated yet.
- The migration is broad (190 documents, 183 hooks) but mechanical, reviewable per slice, and reversible per slice; nothing changes shape on the wire.
- Two things get stricter and may surface latent bugs: `errorPolicy: 'none'` makes any partial response an error (today it is silently accepted), and the CI drift check blocks schema changes that forget to regenerate. Both are the point.

## Alternatives Considered

### A. Announce query errors in the Apollo link

One place, no page changes: every failed query raises a toast keyed by operation name. Rejected because the link has no context — it cannot say which page or which list — and cannot be overridden by a caller; and because the notice would move to the layer of §2 as soon as it existed. Building a thing in order to remove it is not a step.

### B. A boundary component per page

Wrap each page's data in a component that renders the four states. Gives the same guarantees as §2 but requires editing every page; the layer gives them to pages that never change. Available later for pages that want custom per-state rendering, on top of the layer.

### C. Make `projects` non-null in the schema

Would have prevented the incident's redirect by failing the whole `me` query instead. Rejected: a whole-query failure reads as "signed out" today and would still read as something it is not; and the schema's nullability is honest — the field really can fail independently.

### D. Generated React hooks

`typescript-react-apollo` would generate `useListEventsQuery` and friends. Rejected: it reproduces one hook per operation, each a fresh place to combine `loading`, `data` and `error`; the rules of §2 would not be in one place.

### E. Keep the status quo and add a lint rule against `?? []`

Catches the symptom at write time, not the cause. The cast and the fallback are what people reach for when the types do not tell them what the server returns; removing the reason removes the habit.

## Triggers to Revisit

- A consumer of `packages/hooks` needs different error presentation than the application's toast (an embedded editor, a second dashboard): the notifier provider is the seam; if it is not enough, split the layer's state decision from its notification.
- The migration of §3 stalls with both worlds alive for more than two releases: the half-state is worse than either end; decide to finish or revert the slices.
- Apollo is replaced or the server stops publishing `schema.graphql`.
- When the migration completes, revisit ADR 0006's split between the `no-cache` default and `SHARED_CACHE_QUERY_OPTIONS`: with one layer, one fetch policy per hook kind may be enough.

## References

- ADR 0002 — hook organization and the `@usertour/hooks` boundary; §2 keeps its layer placement and replaces its per-operation wrappers and their uniform signature
- ADR 0005, ADR 0006 — Apollo cache strategy, normalized cache and mutation updates
- ADR 0015 — server layering (the schema this generates from)
- PR #544 — an unreported project list is unknown, not empty (the hand-made instance of §2 and §5)
- Incident 2026-10-08 — PgBouncer `max_client_conn`; `me.projects` failing while `me` succeeded
