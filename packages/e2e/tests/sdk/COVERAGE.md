# SDK runtime coverage

What the SDK does at runtime, and which test in this suite asserts it. A row
counts as covered only when a test exercises the behaviour and checks its
outcome; the widget suite (`tests/widget`) renders components from fixtures
and never runs the SDK, so it is noted but does not count.

When you add a behaviour to the SDK, add a row. When you add a test, fill in
its row.

**Priority**

- **P1** — part of the public API a customer's code calls, or a behaviour every
  install depends on. A regression fails silently in the customer's app.
- **P2** — a behaviour an author configures in the builder.
- **P3** — layout, visuals and rarer paths.
- **server** — decided by the server; the protocol server here is scripted, so
  only the SDK's half (what it reports, what it obeys) can be checked here.

## Loader and public API

| Behaviour | Covered by | Priority |
|---|---|---|
| The loader snippet queues calls made before the bundle loads and replays them in order, settling their promises | ✓ loader "calls made before the bundle loads are replayed…" | — |
| Methods left on the stub that the bundle no longer has resolve with a warning instead of hanging | ✓ loader "a method the bundle no longer has warns and resolves…" | — |
| `init`: a different token resets; calls before `init` throw; an empty token throws | ✓ api "calls before init() are refused…", "init() with another token ends…" | — |
| `identify`: handshake, batched upsert, `{ rejected }`, a different user resets | ✓ identity.spec, connection.spec | — |
| `identify` of another user tears down the first user's widgets without EndContent | ✓ api "identifying another user removes the first user’s content…" | — |
| `identifyAnonymous`: reuses the stored id, mints `anon-<uuid>`, upgrades bare UUIDs | ✓ api "identifyAnonymous() › …" | — |
| `isIdentified` follows `identify` and `reset` | ✓ api "isIdentified() follows identify() and reset()" (after a failed identify: see "To pin down") | — |
| `updateUser`, `group`, `updateGroup`: change detection, caching after ack, replay | ✓ identity.spec (`membership`, the pre-group throw and token refresh are not) | — |
| `track`: unbatched, refused before identify | ✓ messages.spec (`userOnly` and a refused event are not) | — |
| `start(id, { once, continue, cvid })` sends StartContent with `start_from_program`; refused before identify | ✓ api "start() asks the server to start the content…" (its result when the server refuses: see "To pin down") | — |
| `?usertour=<id>` in the URL starts that content and is removed from the URL | ✓ api "navigating to a URL with ?usertour=<id>…", "on a page opened with ?usertour=<id> › …" | — |
| `endAll` | ✓ flow "endAll() asks the server to end everything…" | — |
| `isStarted` for each content type | ✓ api "isStarted() is true for each kind of content…" | — |
| `reset`: closes the connection | ✓ connection.spec | — |
| `reset`: removes every widget without EndContent and clears the attribute caches | ✓ api "reset() removes every widget and forgets the user…" | — |
| `setUrlFilter`: the filtered URL in the handshake and UpdateClientContext, sent at once when set later; no report when only stripped parts change | ✓ api "setUrlFilter() › …" | — |
| `setUrlFilter` applied to page rules (trackers, triggers) | — | P2 |
| `setLinkUrlDecorator` on page-navigate and rich-text links | ✓ api "a page-navigate action opens the URL, decorated…", "setLinkUrlDecorator() also decorates links…" | — |
| `setLinkUrlDecorator` on image links | — | P3 |
| `setCustomNavigate` replaces same-tab page navigation; a new tab still opens in the browser | ✓ api "setCustomNavigate() takes same-tab navigation…" | — |
| `disableEvalJs` skips the JavaScript action, with a warning, and the other actions still run | ✓ api "after disableEvalJs() it is skipped…" | — |
| `disableEvalJs` skips custom chat code | — | P3 |
| `registerCustomInput` feeds text-input conditions, by its getter or the element's text | ✓ api "text-input conditions read a registered element…" | — |
| `registerCustomInput` feeds text-fill conditions | — | P2 |
| `setBaseZIndex` moves the widgets' stacking level | ✓ api "setBaseZIndex() moves the stacking level…" (flow and launcher) | — |
| `setTargetMissingSeconds` over the theme's `tooltip.missingTargetTolerance`; above 10 throws | ✓ api "setTargetMissingSeconds() › …" (the 6 s fallback: see "To pin down") | — |
| `setCustomScrollIntoView` is called with the target instead of the default scroll | ✓ api "setCustomScrollIntoView() is handed the target…" | — |
| `setDebug(false)` and its persistence | — (the fixture forces debug on) | P3 |
| `open/close/toggleResourceCenter`, `isResourceCenterOpen`; no-ops before a resource center exists | ✓ api "open, close and toggle drive the panel…" | — |
| `show/hideResourceCenterLauncher`, remembered for a resource center that arrives later | ✓ api "a launcher hidden before the resource center arrives…" | — |
| `on`/`off` (no-ops that warn) | n/a | — |

## Connection, messages and client context

| Behaviour | Covered by | Priority |
|---|---|---|
| Drops, kicks, refusals, backoff, write replay | ✓ connection.spec, identity.spec | — |
| Batching; request ids; ordered handling; unknown kinds | ✓ messages.spec | — |
| UI init retried every second, then critical | ✓ messages "is retried once a second…" | — |
| URL monitor reports navigation | ✓ rules "a navigation is reported with the new page URL" (popstate alone is not) | — |
| The reconnect handshake carries flow, checklist, banner and launcher sessions, conditions and timers | ✓ flow, content-types, rules | — |
| … and the resource center session and the company | — | P2 |
| Expanded state and resource-center position restored after a reload | — (needs a reload helper) | P3 |

## Flows

| Behaviour | Covered by | Priority |
|---|---|---|
| A pushed session opens on its first or current step; nothing is reported | ✓ flow.spec | — |
| Same session pushed again refreshes it in place without moving the step | — | P2 |
| Another session replaces it silently; a dismissed one never returns; Unset removes it | ✓ flow.spec | — |
| The checklist re-expands when the flow ends | — | P2 |
| ForceGoToStep moves without a report | ✓ flow.spec | — |
| Modal and tooltip steps | ✓ flow.spec, iframe-targeting.spec | — |
| Bubble step; clicking the avatar minimises it | — (widget render only) | P2 |
| Hidden step: reported on entry, its trigger runs, nothing renders | — | P2 |
| Close button ends with `close_button_dismiss`; `skippable: false` hides it | partial: the close reason only | P2 |
| Backdrop click with `backdropClickBehavior: dismiss-flow` ends with `backdrop_dismiss` | — | P2 |
| Spotlight on the visible part of the target | ✓ iframe "a target in a box that scrolls" | — |
| `enabledBlockTarget` stops clicks reaching the target | — | P2 |
| Placement side/align; `alignType: auto` flips and shifts | partial: bottom/center only (other sides: widget render only) | P3 |
| `sideOffset`, `alignOffset`, step width | — | P3 |
| Progress bar; branding unless `removeBranding` | — | P3 |
| Selector + sequence across the page and frames; never `<head>` | ✓ flow.spec, iframe-targeting.spec | — |
| Text-matched targets (`content`) | — | P2 |
| A target that appears after the step opens | — | P2 |
| A target re-rendered by the page (replaced element) | partial: frame navigation only | P2 |
| Hidden target hides the tooltip; visible again reopens it | partial: the hidden end state only | P2 |
| Default scroll into view of an off-screen target | — | P2 |
| Clicking the target runs `target.actions` | — | P2 |
| Target never found: ReportTooltipTargetMissing, then `tooltip_target_missing`, at the theme's tolerance | ✓ flow "a tooltip whose target never appears…" | — |
| Target found then hidden past the tolerance: `tooltip_target_missing` | ✓ iframe "…scrolled out above the box" | — |
| `missingTooltipTarget: use-bubble` shows the step as a bubble | — | P2 |
| Step trigger: element condition, wait, dismiss | ✓ flow "a step trigger dismisses the flow after its wait" | — |
| Step trigger: other condition types, a condition that turns true later, other actions | — | P2 |
| A pending trigger wait is cancelled on step change or close | — | P2 |
| step-goto held until acknowledged | ✓ flow.spec | — |
| flow-dismis ends with `action_dismiss` | ✓ flow.spec | — |
| flow-start action sends StartContent `start_from_action` | — | P2 |
| page-navigate, same tab and new tab | ✓ api "links and navigation › …" | — |
| page-navigate runs after the other actions of the same click | — | P2 |
| javascript-evaluate runs the code | ✓ api "a JavaScript action runs its code" | — |
| Button disable/hide rules evaluated, and re-evaluated as the page changes | — (widget renders pre-evaluated fixtures) | P2 |
| Question answers send AnswerQuestion with the right payload, for every question type | — (widget checks the call, not the message) | P2 |
| A question's actions run after its answer is acknowledged; `bindToAttribute` updates the session | — | P2 |
| Required text, choice ranges, "Other" option | — | P3 |
| Step theme over version theme; no theme ends with `store_not_found` | — | P2 |
| Theme variations: the first whose conditions match wins | — | P2 |
| A theme change mid-step | — | P2 |
| Theme `customCss` and its font are loaded | — | P2 |
| Built-in strings follow `userLocale` | — | P3 |
| User attributes fill text and links | — (widget render only) | P3 |
| Stacking: flow above resource center above checklist above launcher and banner | — | P3 |

## Checklists

| Behaviour | Covered by | Priority |
|---|---|---|
| Opens expanded when the server asks; expand/collapse reported | ✓ content-types.spec | — |
| Opens collapsed otherwise | — | P2 |
| Task click reported; a completed task shown once the server pushes it | ✓ content-types.spec | — |
| A task's `clickedActions` collapse the checklist and run | — | P2 |
| A newly completed task re-expands the checklist when no flow runs | — | P2 |
| Hidden tasks, ordered completion, progress count | — | P2 |
| Dismiss asks first, then ends with `dismiss_button` | ✓ content-types.spec | — |
| `preventDismissChecklist` hides the dismiss link | — | P2 |
| Auto-dismiss after the last task | — | P2 |
| Content buttons: actions and live disable/hide rules; `checklist-dismis` action | — | P2 |
| A dismissed session pushed again is ignored; another session replaces it | — | P2 |
| A flow starting collapses it | ✓ content-types "a flow starting collapses the checklist…" | — |

## Launchers

| Behaviour | Covered by | Priority |
|---|---|---|
| Appears on its target, opens its tooltip on click, removed by the server | ✓ content-types "a launcher appears on its target…" | — |
| A press outside, in the page or a frame, closes a click tooltip | ✓ iframe-targeting.spec | — |
| Target missing, appearing later, or hidden | — | P2 |
| Found element with no session starts it (`start_from_condition`) | — | P2 |
| Trigger on the target instead of the launcher | — | P2 |
| `perform-action` runs actions instead of a tooltip | — | P2 |
| Tooltip button actions and the `launcher-dismis` action | — | P2 |
| `dismissAfterFirstActivation` sends DismissLauncher and removes it | — | P2 |
| Several launchers at once; a dismissed one is not re-added | — | P2 |
| Hover trigger | — (widget render only) | P3 |
| Beacon and button types; tooltip anchored to the launcher | — | P3 |

## Banners

| Behaviour | Covered by | Priority |
|---|---|---|
| Top-of-page banner shown first in the body, above the page; dismissal ends with `dismiss_button`; Unset removes it | ✓ content-types.spec | — |
| Bottom of page | — | P2 |
| Embedded in a container element (top/bottom of it, before/after it) | — (only the frame refusal is tested) | P2 |
| Container hidden removes the banner and its placeholder; back again reopens it | — | P2 |
| Sticky / overlay positioning | — | P3 |
| Dismiss button hidden unless `allowUsersToDismissEmbed` | — | P2 |
| Button actions, live button rules, `banner-dismis` action | — | P2 |
| A session updated in place, including a placement change | — | P2 |

## Resource center

| Behaviour | Covered by | Priority |
|---|---|---|
| Opens and closes from its launcher; a clicked block is reported | ✓ content-types "the panel opens and closes…" | — |
| Unset removes it | ✓ content-types.spec | — |
| An action block runs its actions | — | P2 |
| Content-list block: list request, item click starts the content, then navigates | — | P2 |
| Announcement feed: listed, marked seen, unread badge lowered | — | P2 |
| Popup announcement shown when collapsed; closing it marks it seen | — | P2 |
| Tabs, page stack, single-block tab opening by itself | — (widget render only) | P3 |
| Live chat providers: hide their own launcher, open, give the panel back on close | — (needs provider fakes) | P3 |

## Trackers, conditions and timers

| Behaviour | Covered by | Priority |
|---|---|---|
| Element conditions: present, unpresent, `<html>`/`<body>`, disabled, clicked | ✓ rules.spec | — |
| text-input and text-fill | ✓ rules.spec | — |
| Untracked conditions stop reporting; tracked ones ride the handshake | ✓ rules.spec | — |
| current-page and time conditions evaluated in the page | — (unit tests only) | P2 |
| Wait timers: fire once, clamp to 5 min, cancel | ✓ rules.spec | — |
| A restarted wait timer starts over | — | P2 |
| Trackers: page URL, user attribute, element rules | ✓ rules.spec | — |
| A tracker reports again after its rule stops and starts matching | ✓ rules "a tracker whose page-URL rule matches reports once, and again…" | — |
| Hide rules, priority, frequency | server | — |

## Harness

In place:

- **`loader: 'snippet'`** (`test.use`) installs the SDK through the loader
  snippet the install page hands out, instead of adding the bundle.
- **`hostQuery`** (`test.use`) opens the host page with a query string.
- **`sdk.stubNavigation()`** records `window.open` calls instead of navigating.
- **`sdk.pauseClock()`** stops the page clock, so a test can assert what has
  not happened yet before advancing past a deadline.
- **`sdk.recorded(name)`** reads what a test's own callbacks in the page
  recorded in `window.__usertourRecorded`.

Still missing:

- **A reload helper** that re-adds the bundle and the clock after
  `page.reload()`, for state kept in sessionStorage and localStorage.
- **Content builders** in `content.ts` for questions, the flow-start action,
  bubble and hidden steps, theme variations, `customCss`, `userLocale`,
  launcher variants, banner placements and resource-center blocks (navigate,
  JavaScript, links and one-step modal flows are there).
- **Chat provider fakes** (`window.<provider>` objects with open/close hooks).

## To pin down

Behaviours found while compiling this list whose intended outcome needs a
decision before a test can assert it. The first group is read from the code;
the second has not been checked closely.

Read from the code:

- `start()` resolves even when the server answers false; `track()` throws.
- `isIdentified()` stays true after `identify()` fails: the id is set before
  the await on purpose and not rolled back.
- The SDK falls back to 6 s for a missing target when the theme has no
  tolerance; the theme default is 3 s.
- A target found and then hidden ends the flow without
  ReportTooltipTargetMissing and without the `use-bubble` fallback.
- A flow's `destroy()` runs `reset()`, which sets the element watcher to null,
  before `onDestroy()` calls `watcher?.destroy()`; the watcher is never
  destroyed. Whether its timers can still act is unchecked.
- A checklist session that arrives while a flow runs is expanded by `show()`
  without the "no flow running" check `expandChecklist()` makes.
- The mid-session theme check updates `themeSettings` but not `globalStyle`.
  Whether colours stay stale on screen is unchecked.

Not yet checked closely:

- Launcher tooltip buttons never re-evaluate their disable/hide rules.
- Ordered checklist completion counts hidden tasks.
- A tracker report the server did not acknowledge is not retried.
- A tab with a single navigable block reports a click on mount, even collapsed.
- Destroying a component resets click/fill latches shared with server-tracked
  conditions of the same content.
- A hover launcher sends ActivateLauncher on every mouseenter.
- A `hidden` launcher renders an empty clickable element over its target.
- The `use-bubble` fallback is lost when the same session is pushed again.
- A `setCustomScrollIntoView` callback that throws leaves the step unshown.
- page-navigate from a frame navigates the top window.
