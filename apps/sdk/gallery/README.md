# SDK widget gallery

A local page that renders the SDK's own widget components (`src/components/*`)
in fixed states, with no backend. Each case is one URL: `/?case=<name>`.

It exists so widget rendering can be checked in a real browser — by eye while
developing, and automatically by the Playwright suite in `packages/e2e`.

## What is real and what is faked

- **Real:** the SDK components and everything under them (`@usertour/widget`,
  iframes, floating-ui positioning), theme data built by `UsertourTheme`, and
  the stylesheets of the **built** SDK (`dist/<version>/es2020/css`), served at
  the same paths a customer page loads them from.
- **Faked:** the content instance each component subscribes to
  (`src/fake/*`). It holds a store snapshot shaped like the one the SDK builds
  and records every call the widget makes into `window.__galleryCalls`
  instead of acting on it.

Because the CSS comes from the build, run `pnpm build:sdk` after changing
widget classes, or the gallery shows stale styles.

## Run it

```sh
pnpm build:sdk                          # once, and after widget CSS changes
pnpm --filter @usertour/sdk gallery     # http://127.0.0.1:5190
pnpm e2e:widget                         # build + the whole Playwright suite
```

## Query parameters

Any case takes these:

| Parameter | Effect |
|---|---|
| `theme=default\|dark` | The theme to render with (`src/fixtures/theme.ts`). |
| `host=hostile` | Adds a careless global stylesheet to the host page (`src/hostile-host.css`). |

Some cases take their own:

| Case | Parameter |
|---|---|
| `flow-modal` | `position=` a modal placement (`centerTop`, `leftCenter`, `rightBottom`…), `ox=`/`oy=` offsets |
| `flow-question` | `kind=nps\|star\|scale\|single\|multi\|text\|textarea` |
| `resource-center-*` | `placement=top-left\|top-right\|bottom-left\|bottom-right` |

For example `/?case=resource-center-popup&placement=top-left&theme=dark`.

## Add a case

1. Build the host page (the "customer page") as a component. Mark the element
   the widget attaches to with `data-gallery-target`.
2. Build the widget from a fake instance (`src/fake/*`) and fixtures
   (`src/fixtures/*`).
3. Register both under a name in `src/cases/*` and assert on it from
   `packages/e2e/tests/widget/*`.
