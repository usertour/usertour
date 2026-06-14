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
2. \`update_content_version\` — write \`steps\` (flow) or \`data\` (other types) to that draft. \`data\` is field-level merged onto what's there, so a partial body is fine. The \`data\` arg is polymorphic (its shape depends on \`type\`), so it carries no schema on the tool itself — call \`get_content_schema(type)\` for the exact \`data\` (or \`steps\`) JSON Schema before authoring.
3. \`validate_content_version\` — dry-run; returns \`{ ok, errors, warnings }\`. Fix \`errors\` first.
4. \`publish_content\` — goes live. It REJECTS content that wouldn't render (same rules as validate).

## Themes (required)
Every visual type needs a theme or the SDK renders nothing. Call \`list_themes\` and pass a \`themeId\` to \`create_content\`; if unsure use the one with \`isDefault: true\`. \`create_theme\` makes a default-styled theme (name/isDefault only) — theme colors/fonts are not editable via the API; tune them in the theme builder.

## Flow steps
- Step \`type\`: \`tooltip\` | \`modal\` | \`hidden\` | \`bubble\`. **Only \`tooltip\` needs a \`target\`** (a CSS selector of an element on the page); the rest are page-level.
- Every non-\`hidden\` step needs content; a \`button\` block needs both text and an action; a \`question\` block needs a name.
- **Wire navigation by step \`key\`**: give a step \`"key": "pricing"\`, and a button action elsewhere in the SAME write does \`{ "type": "goto_step", "step": "pricing" }\`. Keys are write-only handles; forward and cyclic links work in one call. (You may also target an existing step by its \`cvid\`.)
- **Advance when the user clicks the targeted element**: set the step's \`onClick\` to an action array, e.g. \`[{ "type": "goto_step", "step": "pricing" }]\`. \`onClick\` fires on the real page element the tooltip points at — distinct from a \`button\` block's action (a button rendered inside the tooltip). Tooltip steps with a \`target\` only.

## Text (markdown subset)
Paragraphs; \`# \`/\`## \` headings (h1/h2 only — NO h3+); \`-\`/\`*\` and \`1.\` lists; \`\`\` code fences. Inline: \`**bold**\`, \`*italic*\`, \`[text](url)\`, and \`{{ attribute_code | default: "x" }}\` for user attributes (list codes with \`list_attribute_definitions\`).

## Targets
A \`target\` is a CSS selector: \`{ "by": "selector", "selector": "[data-tour='x']" }\` (or \`{ "by": "text", "text": "Save" }\`). Pick a stable selector in the customer's app.

## Start rules & frequency
\`startRules.frequency.mode\`: \`once\` (single show) | \`multiple\` (up to N per window) | \`unlimited\` (every match). \`multiple\`/\`unlimited\` use an \`every\` window (\`{ times?, duration, unit }\`); \`once\` ignores it.

**No auto-start ≠ unreachable.** With no \`startRules\` (or when none match) the content won't launch on its own — but it can still be started programmatically from the host app via the SDK \`usertour.start(contentId)\` call. Choose this when you want to trigger content from your own button/route rather than by page conditions.

## What each type needs to be usable (else publish is rejected)
- **flow**: ≥1 step; tooltip steps have a target; non-hidden steps have content; goto targets resolve.
- **checklist**: ≥1 item; each item has a name AND a click action or a completion condition.
- **launcher**: a target; show-tooltip behavior needs tooltip content; perform-action behavior needs actions.
- **banner**: content; element-relative placements need a container element.
- **resource-center**: ≥1 tab; each tab has a name and at least one content block.
- **tracker**: an event and trigger conditions (no theme needed — it has no UI).
`;
