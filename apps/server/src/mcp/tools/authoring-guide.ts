/**
 * In-band authoring guide returned by the `get_authoring_guide` MCP tool. It
 * collects the cross-cutting conventions an agent needs to build *usable*
 * content on the first try — the things that don't fit in a single field's
 * description and that the `validate_content_version` / publish gate would
 * otherwise only reveal after a failure. Keep it in sync with the usability
 * validator and the representation schema.
 */
export const AUTHORING_GUIDE = `# Authoring Usertour content

## Lifecycle
1. \`create_content\` — pick a \`type\` and a \`themeId\` (see Themes). Returns the content + its draft \`editedVersionId\`. Non-flow types are seeded with their default \`data\`, so you only set the fields you care about.
2. \`update_content_version\` — write \`steps\` (flow) or \`data\` (other types) to that draft. **Top-level \`data\` fields merge** (omit one to leave it unchanged), **but any list you DO send replaces that whole list** — \`steps\`, or a data list like checklist \`items\`: omitted members are deleted (see Flow steps). The \`data\` arg is polymorphic (its shape depends on \`type\`), so the tool only types it as a generic object — call \`get_content_schema(type)\` for the exact \`data\` (or \`steps\`) JSON Schema before authoring.
3. \`validate_content_version\` — dry-run; returns \`{ ok, errors, warnings }\`. Fix \`errors\` first.
4. \`publish_content\` — goes live. Requires \`contentId\` + \`versionId\`; \`environmentId\` is optional (defaults to the primary environment). Publishing is **per environment** — to ship to several, call it once per \`environmentId\` (\`list_environments\` lists them). It REJECTS content that wouldn't render (same rules as validate).

**Editing published content** — a published version is read-only; writing to it fails with \`E0049\`. Call \`create_content_version\` to fork a fresh editable draft: it copies the steps/data and **preserves each step's \`cvid\`** (only the primary \`id\` is regenerated), so you can keep targeting steps by \`cvid\`/\`key\` without re-reading. Edit the draft, then validate and publish it.

## Themes (required)
Every visual type needs a theme or the SDK renders nothing. Call \`list_themes\` and pass a \`themeId\` to \`create_content\`; if unsure use the one with \`isDefault: true\`. \`create_theme\` / \`update_theme\` start from the default styling and accept a **partial \`settings\`** to brand it (colors, fonts, sizes, …): send only the fields you change — they're field-merged onto the current settings and "Auto" hover/active colors are derived server-side. The \`settings\` arg is a generic object on the tool; call \`get_theme_schema\` for the exact writable fields and their ranges before theming. It writes **style** values (colors, fonts, sizes, layout); **media assets** (avatars, header image, logo, custom icons) and conditional \`variations\` are set in the theme builder, not here.

**Color roles (what each drives — names are misleading, so read this).** Each color is \`{ background, color, hover, active }\` (\`hover\`/\`active\` = \`"Auto"\` derives them):
- \`mainColor\` = the **content surface**: the popover/modal/tooltip **background** (\`.background\`) and **body text** (\`.color\`). This is what makes a theme light vs dark. (Also drives borders / the close button.)
- \`brandColor\` = the **accent**: buttons, progress bar, links, survey, focus highlight, resource-center accent. \`.background\` is the accent fill, \`.color\` the text on it.
- \`buttons.primary\` / \`buttons.secondary\` = explicit button colors; omit them and buttons inherit from \`brandColor\` (primary) / \`mainColor\` (secondary).
- Per-widget colors (\`banner\`, \`checklist\`, \`launcher*\`, …) override only that widget.
- **Most themes only need \`brandColor\` + \`mainColor\`.** A common mistake: treating \`mainColor\` as an accent — it's the surface, so a dark \`mainColor.background\` makes the whole popover dark.

**Color format.** Colors are sRGB hex (\`#rrggbb\`). If the app's brand tokens are \`oklch()\` / \`hsl()\` (common in modern shadcn / Tailwind v4), convert them to hex first — and note \`getComputedStyle().color\` returns the raw \`oklch()\` (not hex) on modern browsers, so round-trip through a canvas: \`const x=document.createElement('canvas').getContext('2d'); x.fillStyle='oklch(0.208 0.042 265.755)'; const hex=x.fillStyle;\` (canvas normalizes to \`#rrggbb\`).

**Fonts.** \`font.fontFamily\` is one of: \`"System font"\` (the system stack), \`"Custom font"\` (a self-hosted font — you also set \`font.customFontFamily\` to its \`@font-face\` family name and define the face in \`customCss\`), or **any Google Font name** (e.g. \`"Inter"\`) which the SDK loads automatically. So \`fontFamily: "Inter"\` just works (loaded from Google Fonts); only use \`customFontFamily\` together with \`fontFamily: "Custom font"\`.

## Flow steps
- **\`steps\` is the complete list, not a patch** — any existing step you omit is deleted. To change one step, send them all. Identify a step to update by its \`cvid\` (stable: it survives forking) or primary \`id\`; omit both to create a new step.
- Step \`type\`: \`tooltip\` | \`modal\` | \`hidden\` | \`bubble\`. **Only \`tooltip\` needs a \`target\`** (a CSS selector of an element on the page); the rest are page-level.
- Every non-\`hidden\` step needs content; a \`button\` block needs both text and an action; a \`question\` block needs a name.
- **Wire navigation by step \`key\`**: give a step \`"key": "pricing"\`, and a button action elsewhere in the SAME write does \`{ "type": "goto_step", "step": "pricing" }\`. Keys are write-only handles; forward and cyclic links work in one call. (You may also target an existing step by its \`cvid\`.)
- **Advance when the user clicks the targeted element**: set the step's \`onClick\` to an action array, e.g. \`[{ "type": "goto_step", "step": "pricing" }]\`. \`onClick\` fires on the real page element the tooltip points at — distinct from a \`button\` block's action (a button rendered inside the tooltip). Tooltip steps with a \`target\` only.
- **React to page state, not only buttons — \`triggers\`**: a step can carry \`"triggers": [{ "when": [<conditions>], "do": [<actions>], "waitMs"?: <ms> }]\`. The \`do\` actions fire when the \`when\` conditions become true, however the user got there — \`when\` takes the same conditions as targeting/start rules, \`do\` the same actions as a button. Use it so a step isn't stranded when the user acts on the page instead of clicking your button: e.g. a tooltip on a nav link with \`"when": [{ "type": "current_url", "includes": ["*/tasks"] }]\` → \`"do": [{ "type": "goto_step", "step": "next" }]\`. Layer \`onClick\` + a \`trigger\` + a button so every path advances.
- **Cross-page tooltip targets.** A tooltip step whose target isn't on the page where the step is reached is, by default, silently dropped and the whole flow ends (theme \`tooltip.missingTargetBehavior: "auto-dismiss"\`, after \`tooltip.missingTargetTolerance\` seconds) — no error. For a flow that crosses pages: (1) set the theme \`tooltip.missingTargetBehavior: "use-bubble"\` so a missing target degrades to a floating bubble instead of vanishing (and/or raise \`tooltip.missingTargetTolerance\` for targets that render just after navigation); and (2) advance with a \`current_url\` trigger (optional \`waitMs\`) so you reach the tooltip step only once you're on the page its target lives on. The pitfall: navigating to page A while the next tooltip's target is on page B — the target is absent on arrival and the step disappears silently.

## Text (markdown subset)
Paragraphs; \`# \`/\`## \` headings (h1/h2 only — NO h3+); \`-\`/\`*\` and \`1.\` lists; \`\`\` code fences. Inline: \`**bold**\`, \`*italic*\`, \`[text](url)\`, and \`{{ attribute_code | default: "x" }}\` for user attributes (list codes with \`list_attribute_definitions\`).

## Targets
A \`target\` identifies one element by a CSS \`selector\`, optionally refined by \`nth\` and/or \`text\` (both optional). The runtime targets the FIRST \`selector\` match unless \`nth\` (0-based) picks another — so either use a selector unique to that element, or pair a stable non-unique selector with \`nth\` (e.g. \`{ "selector": ".toolbar button", "nth": 2 }\`). \`text\` requires the targeted element's exact visible text — use it to pin a content/state (e.g. \`{ "selector": "#status-btn", "text": "Published" }\`); it refines the element already chosen by \`selector\`/\`nth\` and does NOT by itself search among matches, so a non-unique selector with only \`text\` (no \`nth\`) targets the first match and silently won't render. \`nth\` supports 0–4 today. If the element has no stable selector, add one (\`id\`/\`data-*\`) in your app source on that single element; if you can't confirm the target from source/DOM, ask for a verified selector.

## Start rules & frequency
\`startRules.frequency.mode\`: \`once\` (single show) | \`multiple\` (up to N per window) | \`unlimited\` (every match). \`multiple\`/\`unlimited\` use an \`every\` window (\`{ times?, duration, unit }\`); \`once\` ignores it.

**Start-rule knobs are type-gated — setting an unsupported one is rejected (e.g. \`frequency\` on a banner → E1017).** \`frequency\`, \`waitMs\`, \`startIfNotComplete\` are **flow + checklist** only (\`frequency.atLeast\`, flow only); \`priority\` is flow + checklist + resource-center. **Banner and launcher accept none of these — they show purely when their \`startRules\` conditions match.**

**Condition shapes.** Each \`when\` entry is an object keyed on \`type\` — exact values: \`attribute\`, \`segment\`, \`current_url\`, \`element\`, \`flow\`, \`event\`, \`text_input\`, \`text_filled\`, \`time_window\`, \`group\` (an AND/OR of nested conditions). The user/company attribute condition is \`type: "attribute"\` with a **required \`scope\`** (\`user\` | \`company\` | \`companyMembership\`) — there is **no** \`user_attribute\` / \`user-attr\`. (Exact fields per type: \`get_content_schema\`.)

**Targeting "new users" is an audience, not just a frequency.** \`frequency: once\` means "show each matching user a single time" — NOT "only recently-created users"; every user still hits it once. For a true recency audience add an \`attribute\` condition (scope \`user\`) on a date attribute (e.g. \`first_seen_at\`, op \`less_than\`, value \`7\` = first seen in the last 7 days), or make a \`segment\` for it and gate on that — then pair it with \`frequency: once\` so new users see it exactly once.

**\`current_url\` patterns (NOT substring, NOT regex).** \`includes\`/\`excludes\` are arrays of **URL patterns** matched against the WHOLE url (anchored). Syntax: \`*\` is a wildcard within one url part (doesn't cross \`/\`); \`:name\` matches one path segment. **Omitting a part means "any" for it — most importantly, a pattern with NO path matches EVERY path (the whole site).** So scope by writing the path:
- only the homepage → \`*/\` (path is exactly \`/\`)
- one exact page → \`*/pricing\`
- a section and everything under it → \`*/app/*\`
- any page on a host → \`yourapp.com/*\` (or omit the path)
- exclude an area → put \`*/app/admin/*\` in \`excludes\`

(Scheme is usually omitted = any; the domain may use \`*\` for subdomains. A flow matches when it hits an \`includes\` pattern and no \`excludes\` pattern.)

**Auto-start is the presence of \`startRules\` — there is no separate on/off flag.** Include \`startRules\` with ≥1 \`when\` condition to make a flow launch by page conditions; omit \`startRules\` to leave it start-on-demand only. (Don't look for an \`enabled\` field — the server derives it from whether you sent any rules.)

**Launcher / Banner / Resource Center appear ONLY when their \`startRules\` match — there is no ambient "always on" mode.** Unlike a flow you can fire with \`usertour.start()\`, these persistent surfaces have no first-show path other than auto-start matching (a Banner is re-evaluated on every page; a Launcher / Resource Center needs a match to create its first session). With no \`startRules\` the launcher / banner never renders and \`openResourceCenter()\` stays a no-op — publish still succeeds, but \`validate_content_version\` flags it as a warning. For an always-available help hub or launcher, give a permissive \`current_url\` rule that matches the whole site (per the URL-pattern note above, omit the path part); scope it down when it should only show on some pages.

**Sequence auto-starting content so several pieces don't pile onto the first screen.** A \`when\` condition \`{ "type": "flow", "flow": "<contentId>", "state": "seen" | "unseen" | "completed" | "uncompleted" | "active" | "inactive" }\` gates one content on another's state. To reveal a second surface only after the first has run and closed, gate its \`startRules.when\` on the first — e.g. require the welcome flow be \`seen\` AND \`inactive\`: \`{ "type": "group", "match": "all", "conditions": [{ "type": "flow", "flow": "<welcomeId>", "state": "seen" }, { "type": "flow", "flow": "<welcomeId>", "state": "inactive" }] }\`. (Combine conditions with a \`group\`: \`match: "all"\` = AND, \`"any"\` = OR.)

**No auto-start ≠ unreachable.** With no \`startRules\` (or when none match) the content won't launch on its own — but it can still be started programmatically from the host app via the SDK \`usertour.start(contentId)\` call. Choose this when you want to trigger content from your own button/route rather than by page conditions.

## Making it appear (the SDK)
Authoring + publishing only stores the content — it renders only once the host app loads the Usertour SDK. You author here; the app does these (see https://docs.usertour.io/developers/usertourjs-reference/installation):
- **Identify with the SAME id you target.** The app calls \`usertour.identify(userId, attrs)\`; that \`userId\` must equal the \`externalId\` your segments / start-rules / attribute conditions match on. Mismatch = content validates and publishes but never shows for that user (the most common "why isn't it appearing").
- **SDK token ≠ API token.** \`usertour.init(token)\` takes the **environment token** (a public, client-side key). NEVER put the API token (the secret \`utp_…\` used for this MCP) in client code — it grants full project write access.
- **Publish env must match the app's token.** Each environment has its own SDK token (\`list_environments\`). Content published to environment X shows only in an app whose \`init()\` used X's token — publishing to one environment while the app runs another's token is another "why isn't it showing".

## Host integration dependencies (you author these; the host wires the hook)
Some authoring choices only work if the host app wired a matching SDK hook. They publish fine and then fail **silently** at runtime — so flag the dependency when you use the feature and point the developer at the usertour.js reference (https://docs.usertour.io/developers/usertourjs-reference/installation) plus the package's TypeScript types (\`usertour.d.ts\`) for exact signatures. The identify ↔ externalId link above is one of these; the rest:
- **A same-window \`navigate\` action mid-flow** does a **full page reload** unless the host called \`usertour.setCustomNavigate()\` (SPA soft-nav). A reload drops the in-progress flow (the Resource Center survives a reload; flows do not). For a flow that must continue on another page: either rely on \`setCustomNavigate\` (you control an SPA), **or don't carry one flow across the navigation** — make the destination-page guidance its own content triggered by a \`current_url\` start rule (portable and reload-proof).
- **\`text_input\` / \`text_filled\` conditions (and "continue when filled" triggers) on a custom input** (combobox, custom dropdown, contenteditable): the SDK reads values only from native \`<input>\` by default, so the condition never matches unless the host called \`usertour.registerCustomInput()\`.
- **A \`tooltip\` target inside a custom scroll container or sticky-header layout**: default smooth-scroll can land the element under a fixed header or fail to scroll a custom container; the host fixes positioning with \`usertour.setCustomScrollIntoView()\`.
- **SDK UI hidden behind the app's modals/overlays**: the host raises it with \`usertour.setBaseZIndex()\` (default ≈ 1,000,000).
- **\`current_url\` conditions when the URL carries sensitive/dynamic data** (tokens or ids in the path/query): the SDK sends and matches the **full** URL; the host can sanitize with \`usertour.setUrlFilter()\` — then write your patterns against the sanitized form.
- **External links in content that need auth/tracking params**: the host adds them per click with \`usertour.setLinkUrlDecorator()\`.

## What each type needs to be usable (else publish is rejected)
- **flow**: ≥1 step; tooltip steps have a target; non-hidden steps have content; goto targets resolve.
- **checklist**: ≥1 item; each item has a name AND a click action or a completion condition.
- **launcher**: a target; show-tooltip behavior needs tooltip content; perform-action behavior needs actions.
- **banner**: content; element-relative placements need a container element.
- **resource-center**: ≥1 tab; each tab has a name and ≥1 block. Tab blocks use their OWN vocabulary (\`richtext\`, \`divider\`, \`action\`, \`sub-page\`, \`content-list\`, \`live-chat\`) — text goes inside a \`richtext\` block: \`{ "type": "richtext", "content": [{ "object": "block", "type": "text", "markdown": "…" }] }\`, NOT a bare text block.
- **tracker**: a \`data.event\` (an event id from \`list_event_definitions\`) AND \`startRules\` trigger conditions; no theme (it has no UI). Note: a \`current_url\` condition's \`includes\`/\`excludes\` are **arrays** of strings.

## Builtin icon names (resource center + launcher)
An icon field with \`source: "builtin"\` takes a **RemixIcon** name in \`-line\` / \`-fill\` kebab style — **NOT lucide names**. A name that isn't in the set renders **nothing, silently** (no error). So don't guess lucide-style names like \`help-circle\`, \`book-open\`, \`sparkles\`, \`message-circle\` — they will not render. Intent → valid name:
- help / support → \`question-line\` · chat / message → \`chat-line\` · home → \`home-line\` · settings → \`settings-line\`
- new / launch → \`rocket\` · doc / file → \`file-text-line\` · list / menu → \`list-check\` or \`menu-line\` · search → \`search-line\`
- star / favorite → \`star-line\` · notification → \`notification-line\` · check → \`check-line\` · info → \`information-fill\` · mail → \`mail-line\`
Names are \`thing-line\` / \`thing-fill\` (e.g. \`home-line\`, \`home-fill\`). **No builtin exists for some concepts (book, keyboard, sparkles) — use a near match or, when unsure, \`source: "none"\` rather than a guess that silently fails.**
`;
