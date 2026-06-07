# 0002: Hook organization and the `@usertour/hooks` boundary

- **Date:** 2026-05-17
- **Status:** Accepted

## Context

`packages/hooks/src/hooks/gql.ts` had grown to 1306 lines and ~102 exports, all in a single file. The exports are Apollo `useQuery` / `useMutation` wrappers that decode the GraphQL response shape, type-cast the result, and present a uniform call signature to callers. They span at least eight distinct business domains: auth (login, sign-up, password reset, magic link), 2FA, content, users / companies, segments, themes, billing / subscription, integrations, and system admin.

Two pressures showed up during the v0.7.8 auth + router refactor:

1. **The file resists navigation.** Adding a new hook means scrolling through 1300 lines to find the right neighborhood or, more commonly, appending to the bottom. Domain locality has decayed: 2FA, billing, and integration hooks sit interleaved by commit order rather than topic.
2. **The boundary of the package is unstated.** During the refactor, three new "post-login routing" helpers were drafted — `useAuthAfterLogin`, `SocialProviders`, `AuthCard`. None of them are Apollo wrappers; they depend on `react-router-dom`, on apps/web's `apiUrl`, and on the literal `/auth/2fa` / `?next=` / `?challenge=` URL contracts. Without a written boundary, contributors plausibly file these under "hooks shared across the app" and place them in `@usertour/hooks`, dragging in `react-router-dom` and apps/web-private route strings.

At the same time, the repo has three other plausible homes for shared code that this decision must distinguish from:

- `packages/components/ui` (`@usertour/ui`) — composition UI primitives, **explicitly "no business knowledge"** (per the index.ts header comment), free to depend from any consumer
- `packages/business-components` — cross-app business UI (Conditions, GoogleFontCss, settings-domain components) shared between web, builder, and future extensions
- `apps/web/src/pages/<feature>/components/` — feature-scoped UI and hooks for a single React app

Without a written rule, the same three new helpers could also be filed in any of these. Each placement carries different runtime, dependency, and reuse consequences that are not obvious until something breaks.

## Decision

`@usertour/hooks` is **the GraphQL data-access layer**. Its only first-class contents are:

1. **Apollo wrappers** — hooks that take a GraphQL `DocumentNode` from `@usertour/gql`, call `useQuery` / `useMutation` / `useLazyQuery`, decode the nested response shape, and return a uniform call signature (`{ data, loading, error, refetch }` for queries, `{ invoke, loading, error }` for mutations).
2. **Cross-app React utilities** that depend only on React itself and the wrappers above. Examples already present: `useDetectExtension`, `useTooltipTargetMissingSessions`, `useChecklistPreviewAnimation`.

The package **must not depend on**:

- `react-router-dom` (or any other router)
- App-specific environment values (`apiUrl`, `posthogKey`, etc.)
- App-specific URL string contracts (`/auth/2fa`, `?next=`, `/api/auth/${provider}`)
- App-specific UI components or styling decisions

Within the package, hooks are organized **by business domain**, one file per domain. `gql.ts` is the legacy single-file location and is treated as a transitional bucket: existing hooks live there until their domain is extracted; new hooks should land in a domain file from the outset. The public API is preserved across moves by re-exporting each domain file from `packages/hooks/src/index.ts` (`export * from './hooks/<domain>'`).

The first domain split was performed in this same change set: `hooks/auth.ts` now contains the auth / sign-up / magic-link / invite / setup-admin / password-reset / 2FA cluster — 16 hooks and 4 types, 212 lines. `gql.ts` shrank to 1140 lines.

## Consequences

**Good:**

- Each domain file is bounded (`auth.ts` is 212 lines, well under a "scrollable" threshold). Domain locality is restored: all 2FA wrappers are adjacent, all login / sign-up wrappers are adjacent, and a contributor adding `useDisableTwoFactorMutation` finds the right neighborhood immediately.
- The package's dependency graph stays narrow. `@usertour/hooks` currently lists `@apollo/client`, `@usertour/gql`, `@usertour/types`, `@usertour/helpers`, `@usertour/constants`, `react`, `react-dom`, `react-use` — and nothing else. Future contributors can add a hook without expanding this set.
- The boundary makes "this hook would be reused by the builder app" a real, testable claim — it must work without router, without `apiUrl`, without UI dependencies. Helpers that fail those tests stay in the consuming app.
- Public API is stable across moves. Callers continue to `import { useLoginMutation } from '@usertour/hooks'` regardless of which internal file backs it.

**Bad / Accepted:**

- Each new hook now requires one extra classification step ("which domain?"). For genuinely cross-cutting hooks (rare), placement is a judgment call documented case-by-case in code review.
- `gql.ts` still holds ~85 hooks across the remaining domains until follow-up splits. Until then, contributors must read this ADR (and the `packages/hooks/README.md` decision tree) to know that new hooks should not append to `gql.ts` by default.
- The package layout convention is opt-in to maintain: nothing in the build pipeline catches a contributor putting a router-dependent hook in `@usertour/hooks`. Periodic review of new exports is the only enforcement.

## Alternatives Considered

### Alt-A: Keep `gql.ts` as one file, add section comment markers

Annotate `gql.ts` with `// ====== Auth ======` style comment blocks; instruct contributors via PR template to append to the right block.

- **Costs:** comment markers don't bind tooling; `// ====== Auth ======` is invisible to import auto-suggest, file-symbol search, IDE outline density, and to a contributor who scrolls to the bottom and appends. The file is already 1306 lines — the next 200 lines push it to where most editors collapse the outline.
- **Rejected because:** doesn't solve the real problem (size and navigation) and relies on a discipline that the existing 1306 lines show has not been sustained.

### Alt-B: Put `useAuthAfterLogin`, `SocialProviders`, `AuthCard` in `@usertour/hooks`

The three new helpers were drafted alongside the auth hook wrappers. Filing them in `@usertour/hooks` keeps "all auth things" in one package.

- **Costs:** `useAuthAfterLogin` depends on `react-router-dom` (`useNavigate`, `useSearchParams`) and on literal URL strings (`/auth/2fa`, `/auth/2fa/setup`, `?next=`, `?challenge=`) defined in `apps/web/src/routes/auth-guard.tsx`. `SocialProviders` depends on `apiUrl` from `apps/web/src/utils/env` and on the backend's `/api/auth/${provider}?inviteCode=...` URL shape. `AuthCard` is a Card with auth-specific typography (`text-2xl tracking-tight` centered header) and a skeleton sized for the auth form's 4-row layout — no other shell in the app uses the same shape.
- **Rejected because:** moving them in would add `react-router-dom` to `@usertour/hooks`'s dependency surface and bind every consumer (including future non-web React apps that have no router or different routes) to apps/web's private URL contracts. The package's role is data access, not app routing.

### Alt-C: Put them in `@usertour/ui`

`@usertour/ui` is the closest neighbor for `AuthCard` since AuthCard is "just a card." Filing it there would let it be imported anywhere.

- **Costs:** `@usertour/ui`'s `src/index.ts` carries an explicit header: _"composition UI primitives — twice-composed shadcn-style components, no business knowledge, freely depended on by any consumer."_ `useAuthAfterLogin` carries routing knowledge; `SocialProviders` carries `/api/auth/` URL knowledge; `AuthCard` carries auth-page-specific typography decisions (every Settings or Builder card has different chrome). Adding any of them violates the package's stated invariant.
- **Rejected because:** would invalidate the boundary `@usertour/ui` already documents. The cure costs more than the symptom: keeping AuthCard local to `apps/web/src/pages/authentication/components/` costs ~50 lines that aren't reused; relaxing `@usertour/ui`'s "no business knowledge" rule would open a much wider drift.

### Alt-D: Put them in `@usertour/business-components`

`business-components` already hosts cross-app business UI (Conditions, GoogleFontCss, settings-domain components). Filing the auth helpers there fits the "business + cross-app" label.

- **Costs:** auth has exactly one consumer — `apps/web`. The builder app, the extension, and the SDK do not have a login flow on their own. `business-components` is for things consumed by 2+ apps; placing single-consumer code there pollutes the package's semantic and degrades it into a dumping ground.
- **Rejected because:** the "cross-app" claim is the package's purpose. Filing single-app code there breaks that purpose and makes the package useless as a signal.

### Alt-E: Split only the three new wrappers into `auth.ts`, leave existing hooks in `gql.ts`

Treat the new file as a seed; let existing auth hooks (login, signup, 2FA, etc.) migrate later.

- **Costs:** the same business domain is split across two files for an indefinite period. Callers searching for `useLoginMutation` vs `useCreateMagicLinkMutation` find them in different places with no rule that explains why. The seed-only state is strictly worse than either extreme: it does not reduce `gql.ts`'s size meaningfully, and it adds a navigation cost (which file is auth-related?) for daily use.
- **Rejected because:** it is the "patches" anti-pattern — adding files in lockstep with each new commit, with no architecture step. If the split is worth doing, the existing same-domain hooks come with it; if it isn't, the new ones append to `gql.ts` until that case changes.

## Triggers to Revisit

Reopen this decision when any of:

- A second React frontend (builder web, desktop, embedded) needs the post-login routing flow. At that point `useAuthAfterLogin` is a candidate for extraction into a router-agnostic shape (inject route strings as configuration, or split into a non-React handler that the consumer wires into its own router). Today there is exactly one consumer, so the extraction would pay for itself only when there are two.
- The GraphQL stack is replaced (codegen + typed-document-node, urql, TanStack Query, etc.) such that the hand-written wrapper layer becomes redundant. At that point the package's contents collapse and the domain split may dissolve into the generated client.
- A domain file grows past ~400 lines or ~25 hooks, indicating that domain itself needs sub-splitting (e.g. `admin/users.ts`, `admin/instance-settings.ts`). The split logic mirrors this ADR — new directory, re-export at `index.ts`.
- The `gql.ts` legacy bucket is fully drained. At that point this ADR should be amended (or superseded) to reflect that the transitional state is over: new hooks go in a domain file, full stop, and `gql.ts` is deleted.

## Implementation reference

The first split (auth domain) is on `feat/v0.7.8`:

- New file: `packages/hooks/src/hooks/auth.ts` — 13 hooks moved out of `gql.ts` + 3 new wrappers (`useResetUserPasswordMutation`, `useCreateMagicLinkMutation`, `useResendMagicLinkMutation`) that replace raw `useMutation(documentNode)` calls in three `apps/web` callsites.
- Modified: `packages/hooks/src/index.ts` — added `export * from './hooks/auth'` before the existing `export * from './hooks/gql'`. Public API surface is unchanged.
- Modified: `packages/hooks/src/hooks/gql.ts` — removed 16 hooks + 4 types + 13 DocumentNode imports + 1 `useCallback` import (no longer referenced).

The day-to-day "where does this new hook go" decision tree, the current list of domain files, and the in-package house style (mutation vs query return shapes, naming) live in `packages/hooks/README.md`, which links back to this ADR for the architectural _why_.
