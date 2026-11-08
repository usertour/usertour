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
| A `setCustomScrollIntoView` callback that throws: the step still shows, scrolled the default way | ✓ api "a setCustomScrollIntoView() callback that throws…" | — |
| The loader snippet queues calls made before the bundle loads and replays them in order, settling their promises | ✓ loader "calls made before the bundle loads are replayed…" | — |
| Methods left on the stub that the bundle no longer has resolve with a warning instead of hanging | ✓ loader "a method the bundle no longer has warns and resolves…" | — |
| `init`: a different token resets; calls before `init` throw; an empty token throws | ✓ api "calls before init() are refused…", "init() with another token ends…" | — |
| `identify`: handshake, batched upsert, `{ rejected }`, a different user resets | ✓ identity.spec, connection.spec | — |
| `identify` of another user tears down the first user's widgets without EndContent | ✓ api "identifying another user removes the first user’s content…" | — |
| `identifyAnonymous`: reuses the stored id, mints `anon-<uuid>`, upgrades bare UUIDs | ✓ api "identifyAnonymous() › …" | — |
| `isIdentified` follows `identify` and `reset`, and stays true when `identify` fails | ✓ api "isIdentified() follows identify() and reset()", "isIdentified() stays true when identify() fails…" | — |
| `updateUser`, `group`, `updateGroup`: change detection, caching after ack, replay | ✓ identity.spec (`membership`, the pre-group throw and token refresh are not) | — |
| `track`: unbatched, refused before identify | ✓ messages.spec (`userOnly` and a refused event are not) | — |
| `start(id, { once, continue, cvid })` sends StartContent with `start_from_program` and resolves with whether the server started it; refused before identify | ✓ api "start() asks the server to start the content…" | — |
| `?usertour=<id>` in the URL starts that content and is removed from the URL | ✓ api "navigating to a URL with ?usertour=<id>…", "on a page opened with ?usertour=<id> › …" | — |
| `endAll` | ✓ flow "endAll() asks the server to end everything…" | — |
| `isStarted` for each content type | ✓ api "isStarted() is true for each kind of content…" | — |
| `reset`: closes the connection | ✓ connection.spec | — |
| `reset`: removes every widget without EndContent and clears the attribute caches | ✓ api "reset() removes every widget and forgets the user…" | — |
| `setUrlFilter`: the filtered URL in the handshake and UpdateClientContext, sent at once when set later; no report when only stripped parts change | ✓ api "setUrlFilter() › …" | — |
| `setUrlFilter` applied to page rules (trackers, triggers) | ✓ rules "a tracker’s page-URL rule sees the URL as setUrlFilter() rewrites it", flow-steps "a page-URL condition sees the URL as setUrlFilter() rewrites it" | — |
| `setLinkUrlDecorator` on page-navigate and rich-text links | ✓ api "a page-navigate action opens the URL, decorated…", "setLinkUrlDecorator() also decorates links…" | — |
| `setLinkUrlDecorator` on image links | ✓ api "an image’s link is decorated by setLinkUrlDecorator() too" | — |
| `setCustomNavigate` replaces same-tab page navigation; a new tab still opens in the browser | ✓ api "setCustomNavigate() takes same-tab navigation…" | — |
| `disableEvalJs` skips the JavaScript action, with a warning, and the other actions still run | ✓ api "after disableEvalJs() it is skipped…" | — |
| `disableEvalJs` skips custom chat code | ✓ resource-center "a custom live chat block’s code is skipped after disableEvalJs()" | — |
| `registerCustomInput` feeds text-input conditions, by its getter or the element's text | ✓ api "text-input conditions read a registered element…" | — |
| `registerCustomInput` feeds text-fill conditions | ✓ rules "text-fill on a custom input registered by the host…" | — |
| `setBaseZIndex` moves the widgets' stacking level | ✓ api "setBaseZIndex() moves the stacking level…" (flow and launcher) | — |
| `setTargetMissingSeconds` over the theme's `tooltip.missingTargetTolerance`, else the theme default (3 s); above 10 throws | ✓ api "setTargetMissingSeconds() › …" | — |
| `setCustomScrollIntoView` is called with the target instead of the default scroll | ✓ api "setCustomScrollIntoView() is handed the target…" | — |
| `setDebug(false)` silences the log and drops the SDK from the stored flag | ✓ api "setDebug(false) silences the log at once…" | — |
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
| … and the resource center session and the company | ✓ content-types "names every session on screen and the company" | — |
| Expanded state and the resource center's page restored after a reload | ✓ checklist "a checklist left expanded is expanded again after the page reloads", resource-center "an open resource center comes back on the page it was on…" | — |

## Flows

| Behaviour | Covered by | Priority |
|---|---|---|
| A step shown as a bubble for its missing target stays a bubble when the session is pushed again | ✓ flow-steps "a step shown as a bubble for its missing target stays a bubble…" | — |
| page-navigate from an SDK running in a frame navigates that frame, not the page around it | ✓ frame-hosted "a page-navigate action from an SDK running in a frame…" | — |
| A pushed session opens on its first or current step; nothing is reported | ✓ flow.spec | — |
| The same session pushed again updates the open step in place | ✓ flow-steps "the same session pushed again updates the open step in place" | — |
| Another session replaces it silently; a dismissed one never returns; Unset removes it | ✓ flow.spec | — |
| The checklist a flow collapsed opens again when the flow ends | ✓ flow-steps "the checklist a flow collapsed opens again…" | — |
| ForceGoToStep moves without a report | ✓ flow.spec | — |
| Modal and tooltip steps | ✓ flow.spec, iframe-targeting.spec | — |
| Bubble step by its avatar; clicking the avatar folds it away and back | ✓ flow-steps "a bubble step sits by its avatar…" | — |
| Hidden step: reported on entry, its trigger runs, nothing renders | ✓ flow-steps "a hidden step shows nothing…" | — |
| Close button ends with `close_button_dismiss`; `skippable: false` hides it | ✓ flow "the close button ends the flow…", flow-steps "a step that is not skippable…" | — |
| A modal's backdrop click: `backdrop_dismiss` with `backdropClickBehavior: dismiss-flow`, nothing with `do-nothing` | ✓ flow-steps "a click on a modal's backdrop…" | — |
| Spotlight on the visible part of the target | ✓ iframe "a target in a box that scrolls" | — |
| `enabledBlockTarget` stops clicks reaching the target; without it they go through | ✓ flow-steps "with the backdrop on, a click on the target…" | — |
| Placement side/align; `alignType: auto` flips a tooltip that would not fit | ✓ flow-layout "side and align put it on that side…", "alignType auto flips…" | — |
| `sideOffset`, `alignOffset`, step width | ✓ flow-layout "sideOffset and alignOffset move it by that much", "a step’s own width is used over the theme’s" | — |
| Progress bar; branding unless `removeBranding` | ✓ flow-layout "the progress bar counts the steps…", "the branding line shows unless the project removes it" | — |
| Selector + sequence across the page and frames; never `<head>` | ✓ flow.spec, iframe-targeting.spec | — |
| A target's `content`: the matched element must have that text, or there is no target | ✓ flow-steps "a target pinned to the text…" | — |
| A target that appears after the step opens | ✓ flow-steps "a target that appears after the step opens…" | — |
| A target re-rendered by the page (replaced element) | ✓ flow-steps "a target the page re-renders keeps the tooltip…", iframe "a frame that navigates…" | — |
| A target scrolled out of view (of the page, a scrolling container or a frame) hides the tooltip without a deadline; scrolled back, it reopens | ✓ flow "a tooltip whose target is scrolled out of the page…", iframe "…scrolled out above the box" | — |
| Default scroll into view of an off-screen target | ✓ flow-steps "an off-screen target is scrolled into view…" | — |
| Clicking the target runs `target.actions` | ✓ flow-steps "clicking the target runs the step’s target actions" | — |
| Leaving a tooltip step stops its target lookup: coming back waits the full time again | ✓ flow-steps "returning to a tooltip step waits its full time again…" | — |
| Target never found: ReportTooltipTargetMissing, then `tooltip_target_missing`, at the theme's tolerance | ✓ flow "a tooltip whose target never appears…" | — |
| A target that leaves the page (removed, not rendered) ends the flow at the tolerance with `tooltip_target_missing`, without ReportTooltipTargetMissing | ✓ flow "a tooltip whose target leaves the page…" | — |
| Theme `missingTargetBehavior: use-bubble`: a target that left turns the step into a bubble | ✓ flow "with the theme set to show a bubble…" | — |
| Theme `missingTargetBehavior: use-bubble`: a target never found shows the step as a bubble, and is still reported | ✓ flow-steps "with the theme set to show a bubble, a target never found…" | — |
| Step trigger: element condition, wait, dismiss | ✓ flow "a step trigger dismisses the flow after its wait" | — |
| Step trigger: a condition that turns true later, a page-URL condition, a step-goto action | ✓ flow-steps "step triggers › …" | — |
| A pending trigger wait is cancelled on step change | ✓ flow-steps "a trigger still waiting is cancelled…" | — |
| step-goto held until acknowledged | ✓ flow.spec | — |
| flow-dismis ends with `action_dismiss` | ✓ flow.spec | — |
| flow-start action sends StartContent `start_from_action` with its step | ✓ flow-steps "a flow-start action asks the server…" | — |
| page-navigate, same tab and new tab | ✓ api "links and navigation › …" | — |
| page-navigate runs after the other actions of the same click | ✓ flow-steps "a page-navigate action runs after the other actions…" | — |
| javascript-evaluate runs the code | ✓ api "a JavaScript action runs its code" | — |
| Button disable/hide rules evaluated, and re-evaluated as the page changes | ✓ flow-steps "button rules follow the page…" | — |
| Question answers send AnswerQuestion with the right payload, for every question type; submit types only on submit | ✓ flow-questions "a <kind> answer is reported with its value" ×7 | — |
| A question's actions run only once its answer is acknowledged; `bindToAttribute` shows in a later step | ✓ flow-questions "a question’s actions run…" ×2 | — |
| Required text, choice ranges, "Other" option | ✓ flow-questions "a required text question…", "…outside its range of picks", "the Other option adds what the user typed…" | — |
| Step theme over version theme; no theme ends with `store_not_found` | ✓ flow-themes "a step’s own theme is used…", "a flow without a theme…" | — |
| Theme variations: the first whose conditions match wins | ✓ flow-themes "the first variation whose conditions match is used" | — |
| A variation that starts matching mid-step recolours the open step | ✓ flow-themes "a variation that starts matching while the step is open…" | — |
| Theme `customCss` and its Google font are loaded into the step | ✓ flow-themes "the theme’s custom CSS and its Google font…" | — |
| Built-in strings follow `userLocale` | ✓ checklist "the built-in strings follow the session’s locale" | — |
| User attributes fill text and links | ✓ flow-layout "user attributes fill text and link URLs" | — |
| Stacking: flow above resource center above checklist above launcher and banner | ✓ flow-layout "the widgets stack…" | — |

## Checklists

| Behaviour | Covered by | Priority |
|---|---|---|
| Opens expanded when the server asks; expand/collapse reported | ✓ content-types.spec | — |
| Opens collapsed otherwise, its launcher counting the tasks left | ✓ checklist "a session the server does not ask to expand opens collapsed…" | — |
| Task click reported; a completed task shown once the server pushes it | ✓ content-types.spec | — |
| A task's `clickedActions` collapse the checklist and run; a task completed by its own click keeps it open | ✓ checklist "task clicks › …" | — |
| A newly completed task re-expands the checklist when no flow runs | ✓ checklist "a task the server completes expands a collapsed checklist…" | — |
| Hidden tasks: not listed, not counted in the progress or the launcher | ✓ checklist "a hidden task is not listed…" | — |
| Ordered completion: a task waits for the visible tasks before it; a hidden one does not hold it back | ✓ checklist "in order, a task waits…" | — |
| Dismiss asks first, then ends with `dismiss_button` | ✓ content-types.spec | — |
| `preventDismissChecklist` hides the dismiss link | ✓ checklist "with dismissal prevented…" | — |
| Auto-dismiss five seconds after the last task, with `auto_dismissed` | ✓ checklist "set to dismiss itself…" | — |
| Content buttons: actions and live disable/hide rules; `checklist-dismis` action | ✓ checklist "the checklist’s own buttons › …" | — |
| A dismissed session pushed again is ignored; another session replaces it | ✓ checklist "sessions › …" | — |
| A flow starting collapses it | ✓ content-types "a flow starting collapses the checklist…" | — |
| A checklist that arrives while a flow runs stays collapsed until the flow ends | ✓ flow-steps "a checklist that arrives while a flow runs…" | — |

## Launchers

| Behaviour | Covered by | Priority |
|---|---|---|
| A `hidden` launcher has no box of its own to catch clicks; its target opens the tooltip | ✓ launcher "a hidden launcher has no box of its own…" | — |
| Appears on its target, opens its tooltip on click, removed by the server | ✓ content-types "a launcher appears on its target…" | — |
| A press outside, in the page or a frame, closes a click tooltip | ✓ iframe-targeting.spec | — |
| Target missing, appearing later, or hidden | ✓ launcher "a launcher waits for its target…" | — |
| Found element with no session starts it (`start_from_condition`) | ✓ launcher "offered without a session…" | — |
| Trigger on the target instead of the launcher | ✓ launcher "set to open from its target…" | — |
| `perform-action` runs actions instead of a tooltip | ✓ launcher "set to perform an action…" | — |
| Tooltip button actions and the `launcher-dismis` action | ✓ launcher "a tooltip button runs its actions…" | — |
| Tooltip button rules re-evaluated as the page changes | ✓ launcher "a tooltip button’s rules follow the page…" | — |
| `dismissAfterFirstActivation` sends DismissLauncher and removes it | ✓ launcher "set to dismiss after its first use…" | — |
| Several launchers at once; a dismissed one is not re-added | ✓ launcher "several launchers show at once…" | — |
| Hover trigger: opens on hover, closes once the pointer leaves | ✓ launcher "a hover launcher opens its tooltip…" | — |
| Beacon and button types; tooltip anchored to the launcher | ✓ launcher "a beacon pulses at its target; a button launcher…" | — |

## Banners

| Behaviour | Covered by | Priority |
|---|---|---|
| Top-of-page banner shown first in the body, above the page; dismissal ends with `dismiss_button`; Unset removes it | ✓ content-types.spec | — |
| Bottom of page | ✓ banner "at the bottom of the page…" | — |
| Embedded in a container element (top/bottom of it, before/after it) | ✓ banner "placed <placement>, a banner goes…" ×4 | — |
| A container the page re-renders gets the banner back with its content | banner "a container the page re-renders…" — fixme until the banner mount of feat/embed (#601) is under this branch | — |
| Container hidden removes the banner and its placeholder; back again reopens it | ✓ banner "a banner placed by a container leaves with it…" | — |
| Sticky / overlay positioning | ✓ banner "sticky and overlay › …" ×3 | — |
| Dismiss button hidden unless `allowUsersToDismissEmbed` | ✓ banner "without user dismissal allowed…" | — |
| Button actions, live button rules, `banner-dismis` action | ✓ banner "its buttons › …" | — |
| A session updated in place, including a placement change | ✓ banner "a session updated in place › …" (the placement change: fixme until #601 is under this branch) | — |

## Resource center

| Behaviour | Covered by | Priority |
|---|---|---|
| A tab holding a single page counts a click each time the user opens onto it, never while closed | ✓ content-types "a tab holding a single page counts a click…" | — |
| Opens and closes from its launcher; a clicked block is reported | ✓ content-types "the panel opens and closes…" | — |
| Unset removes it | ✓ content-types.spec | — |
| An action block runs its actions and closes the panel | ✓ resource-center "an action block runs its actions…" | — |
| Content-list block: list request, the block's labels over the server's names, item click starts the content, navigates, closes the panel | ✓ resource-center "a content list asks the server for its items…" | — |
| Announcement feed: listed, the unseen ones marked seen in one batch, the launcher badge lowered | ✓ resource-center "the announcement feed lists what the server has…" | — |
| Popup announcement shown only while collapsed; closing it marks it seen with its source | ✓ resource-center "a popup announcement shows while the panel is closed…" | — |
| Tabs, page stack, single-block tab opening by itself | ✓ resource-center "tabs switch the page…", content-types "a tab holding a single page…" | — |
| Live chat providers: hide their own launcher, open, give the panel back on close | ✓ resource-center "a live chat provider: its own launcher hidden…" (one provider, faked on the page) | — |

## Trackers, conditions and timers

| Behaviour | Covered by | Priority |
|---|---|---|
| Element conditions: present, unpresent, `<html>`/`<body>`, disabled, clicked | ✓ rules.spec | — |
| text-input and text-fill | ✓ rules.spec | — |
| Untracked conditions stop reporting; tracked ones ride the handshake | ✓ rules.spec | — |
| current-page and time conditions evaluated in the page | ✓ rules "a tracker whose page-URL rule matches…", "a tracker’s time rule holds once the clock passes its start" | — |
| Wait timers: fire once, clamp to 5 min, cancel | ✓ rules.spec | — |
| A restarted wait timer starts over | ✓ rules "a timer started again for the same version starts over" | — |
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

Behaviours that look wrong but are not settled; a test that settles each one
belongs with its fix.

- A tracked "element clicked" or "text filled" condition is forgotten when a
  widget of the same content is destroyed: `destroy()` removes the content's
  shared rules evaluator, and the monitor's next report says the condition is
  inactive. Confirmed by a test (the reports read `[false, true, false]`), but
  not fixed on its own: the server starts content while a condition is true,
  not when it turns true, so with the report corrected a repeatable flow
  started by a click would restart as often as its frequency allows instead
  of once per click, which is what the forgetting gave by accident. To settle
  together with the server: a latched client condition used for auto-start
  counts once per activation.
- A tracker occurrence whose report got no answer (the 30 s send timeout, after
  a long outage) or was refused is never reported again: the edge is consumed
  either way. Whether an unanswered report should be retried is a decision.
