# Page-entry fallback conventions

Every page-level component eventually faces "what do I render when I
can't?". Bare `return null;` or `return <></>;` at the top of a route
component is technically valid but usually wrong: it hides routing
bugs as blank screens and turns "user typed a bad URL" into a silent
failure indistinguishable from "page is still loading".

This guide names the four cases that show up at route entries and the
default for each.

## The decision

| Case | What it means | Render |
|---|---|---|
| **A. Route-misconfig** | A path param the route declaration requires (`:contentId`) is somehow missing on the way in. React Router shouldn't let this happen, but if it does we want a graceful exit. | `<NotFound />` |
| **B. Semantic 404** | URL syntactically matched but the resource doesn't exist — unknown slug (`/env/X/widgets`), deleted record, etc. | `<NotFound />` |
| **C. Context hydrating** | `useAppContext()` hasn't resolved `environment` / `project` / `userInfo` yet; the page genuinely can't render anything meaningful for a few ms. | `return null;` |
| **D. In-flight data load** | Query is loading and we have no prior data to show. | `<ContentLoading />` (or component-local skeleton) |

The principle behind the split: **A and B are user-facing dead ends —
they get a real 404 UI. C and D are transients — they get a quiet
placeholder.**

## Why not `throw` for A?

A throw at render-time is caught by the ErrorBoundary and turns into
an error screen. Since A is "should-never-happen", an error screen
adds drama for a state that's never actually reached — and if it ever
*does* reach (e.g. a future contributor changes a route from
`/x/:id` to `/x/:id?`), we'd rather they see the standard NotFound
than an ErrorBoundary. `<NotFound />` handles both cases cleanly.

## Why not a loading spinner for C?

`useAppContext` typically resolves in a single render tick after auth
hydrates. Showing a `<ContentLoading />` spinner for that one frame
produces a visible flash; rendering `null` for the same frame produces
nothing the user can perceive. The exception is when context can take
hundreds of ms (rare here) — then move to D.

## Examples

### Mixed: route-missing → NotFound, context-hydrating → null

```tsx
// apps/web/src/pages/contents/list.tsx
export const ContentList = () => {
  const { contentType } = useParams();
  const { environment, project } = useAppContext();

  // C — AppContext is hydrating; brief null beats a transient flash.
  if (!environment || !project) {
    return null;
  }

  // A + B — missing path param, or an unknown content-type slug.
  if (!contentType) {
    return <NotFound />;
  }
  const config = CONTENT_CONFIG[contentType];
  if (!config) {
    return <NotFound />;
  }

  // ...real render
};
```

### Multiple route params plus semantic 404, one fall-through

```tsx
// apps/web/src/pages/contents/detail.tsx
export const ContentDetail = () => {
  const { contentId, contentType, type } = useParams();

  // A + B in one `||` chain. Same effective TypeScript narrowing as
  // multiple separate guards, single graceful exit.
  if (
    !contentId ||
    !type ||
    !contentType ||
    !SUPPORTED_CONTENT_TYPES.includes(
      contentType as (typeof SUPPORTED_CONTENT_TYPES)[number],
    )
  ) {
    return <NotFound />;
  }

  return <ContentDetailView contentId={contentId} type={type} contentType={contentType as ContentTypeName} />;
};
```

### Resource not found after a finished query

```tsx
// apps/web/src/pages/settings/themes/detail.tsx
const { theme, loading } = useGetThemeQuery(themeId);

if (loading) {
  return <ContentLoading message={t('common.loading')} />;  // D
}

if (!theme) {
  return <NotFound />;  // B — server returned null
}
```

## Anti-patterns

```tsx
// ❌ Silent blank — user can't tell if it's loading, broken, or 404.
if (!contentId) {
  return <></>;
}

// ❌ ErrorBoundary drama for a state the route already guarantees can't happen.
if (!contentId) {
  throw new Error('ContentDetail mounted without contentId — route misconfigured');
}

// ❌ Spinner flash for an instant context hydration.
if (!environment) {
  return <ContentLoading />;
}
```

## When to deviate

- **Auth-specific surfaces**: routes like `/auth/invite/:inviteCode`
  can substitute `<Navigate to="/auth/signin" replace />` for the
  route-missing case when that's a friendlier landing than NotFound.
- **Deep-nested admin tools**: a sub-page that can only be reached
  from an authenticated dashboard may prefer redirecting to the
  parent list rather than showing 404.
- **Loading-from-cache races**: if a query starts with `data` already
  in cache (`cache-and-network`), don't add a D-case guard at all —
  let the cached data render and let the network refresh happen in
  the background.

## Existing utilities

| Utility | Path |
|---|---|
| `NotFound` (generic 404 with "back to home" CTA) | `apps/web/src/routes/not-found.tsx` |
| `ContentDetailNotFound` (404 with "back to {contentType} list" CTA, for cases where the parent collection is known) | `apps/web/src/pages/contents/components/detail/content-detail-not-found.tsx` |
| `ContentLoading` (full-area spinner) | `@usertour/ui` |
