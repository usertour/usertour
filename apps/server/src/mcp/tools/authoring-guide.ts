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
Every visual type needs a theme or the SDK renders nothing. Call \`list_themes\` and pass a \`themeId\` to \`create_content\`; if unsure use the one with \`isDefault: true\`. \`create_theme\` makes a default-styled theme (name/isDefault only) — theme colors/fonts are not editable via the API; tune them in the theme builder.

## Flow steps
- **\`steps\` is the complete list, not a patch** — any existing step you omit is deleted. To change one step, send them all. Identify a step to update by its \`cvid\` (stable: it survives forking) or primary \`id\`; omit both to create a new step.
- Step \`type\`: \`tooltip\` | \`modal\` | \`hidden\` | \`bubble\`. **Only \`tooltip\` needs a \`target\`** (a CSS selector of an element on the page); the rest are page-level.
- Every non-\`hidden\` step needs content; a \`button\` block needs both text and an action; a \`question\` block needs a name.
- **Wire navigation by step \`key\`**: give a step \`"key": "pricing"\`, and a button action elsewhere in the SAME write does \`{ "type": "goto_step", "step": "pricing" }\`. Keys are write-only handles; forward and cyclic links work in one call. (You may also target an existing step by its \`cvid\`.)
- **Advance when the user clicks the targeted element**: set the step's \`onClick\` to an action array, e.g. \`[{ "type": "goto_step", "step": "pricing" }]\`. \`onClick\` fires on the real page element the tooltip points at — distinct from a \`button\` block's action (a button rendered inside the tooltip). Tooltip steps with a \`target\` only.

## Text (markdown subset)
Paragraphs; \`# \`/\`## \` headings (h1/h2 only — NO h3+); \`-\`/\`*\` and \`1.\` lists; \`\`\` code fences. Inline: \`**bold**\`, \`*italic*\`, \`[text](url)\`, and \`{{ attribute_code | default: "x" }}\` for user attributes (list codes with \`list_attribute_definitions\`).

## Targets
A \`target\` points at an element by CSS selector: \`{ "selector": "[data-tour='x']" }\`. Pick a stable selector in the customer's app. Optionally add \`text\` to require the element's visible text (\`{ "selector": "button", "text": "Save" }\`), and \`nth\` (0-based) to choose among multiple matches.

## Start rules & frequency
\`startRules.frequency.mode\`: \`once\` (single show) | \`multiple\` (up to N per window) | \`unlimited\` (every match). \`multiple\`/\`unlimited\` use an \`every\` window (\`{ times?, duration, unit }\`); \`once\` ignores it.

**Auto-start is the presence of \`startRules\` — there is no separate on/off flag.** Include \`startRules\` with ≥1 \`when\` condition to make a flow launch by page conditions; omit \`startRules\` to leave it start-on-demand only. (Don't look for an \`enabled\` field — the server derives it from whether you sent any rules.)

**No auto-start ≠ unreachable.** With no \`startRules\` (or when none match) the content won't launch on its own — but it can still be started programmatically from the host app via the SDK \`usertour.start(contentId)\` call. Choose this when you want to trigger content from your own button/route rather than by page conditions.

## Making it appear (the SDK)
Authoring + publishing only stores the content — it renders only once the host app loads the Usertour SDK. You author here; the app does these (see https://docs.usertour.io/developers/usertourjs-reference/overview):
- **Identify with the SAME id you target.** The app calls \`usertour.identify(userId, attrs)\`; that \`userId\` must equal the \`externalId\` your segments / start-rules / attribute conditions match on. Mismatch = content validates and publishes but never shows for that user (the most common "why isn't it appearing").
- **SDK token ≠ API token.** \`usertour.init(token)\` takes the **environment token** (a public, client-side key). NEVER put the API token (the secret \`utp_…\` used for this MCP) in client code — it grants full project write access.
- **Publish env must match the app's token.** Each environment has its own SDK token (\`list_environments\`). Content published to environment X shows only in an app whose \`init()\` used X's token — publishing to one environment while the app runs another's token is another "why isn't it showing".

## What each type needs to be usable (else publish is rejected)
- **flow**: ≥1 step; tooltip steps have a target; non-hidden steps have content; goto targets resolve.
- **checklist**: ≥1 item; each item has a name AND a click action or a completion condition.
- **launcher**: a target; show-tooltip behavior needs tooltip content; perform-action behavior needs actions.
- **banner**: content; element-relative placements need a container element.
- **resource-center**: ≥1 tab; each tab has a name and ≥1 block. Tab blocks use their OWN vocabulary (\`richtext\`, \`divider\`, \`action\`, \`sub-page\`, \`content-list\`, \`live-chat\`) — text goes inside a \`richtext\` block: \`{ "type": "richtext", "content": [{ "object": "block", "type": "text", "markdown": "…" }] }\`, NOT a bare text block.
- **tracker**: a \`data.event\` (an event id from \`list_event_definitions\`) AND \`startRules\` trigger conditions; no theme (it has no UI). Note: a \`current_url\` condition's \`includes\`/\`excludes\` are **arrays** of strings.
`;
