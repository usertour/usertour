/**
 * The MCP server `instructions` — delivered in the initialize handshake, so an
 * agent has the ROUTING MAP before its first tool call (which tool for which
 * intent, what to read before authoring). Division of labor: this stays a
 * compact map; the deep authoring contract (step/target rules, markdown subset,
 * per-type publish requirements) lives in `get_authoring_guide` and is fetched
 * on demand. Every line here earns its place by a mistake agents actually made
 * in zero-knowledge evals (not knowing to read the guide first, guessing
 * non-flow `data` shapes, re-targeting blindly instead of diagnosing, treating
 * a truncated list as complete).
 */
export const SERVER_INSTRUCTIONS = `You are connected to a Usertour workspace — a user-onboarding platform whose content (flows, checklists, launchers, banners, trackers, resource centers) is delivered to end users by an in-app SDK.

Before AUTHORING or EDITING content, read \`get_authoring_guide\` once. It is the contract for content that actually renders; do not author from guesswork.

Route by intent:
- Create / edit content → create_content, then update_content_version on the draft, then validate_content_version, then publish_content. A published version is immutable — fork it with create_content_version before editing.
- Pick a theme → list_themes (page with nextCursor). Every visual type except tracker requires a themeId; call get_theme_schema before writing theme settings.
- Non-flow content body → the \`data\` shape is per-type: fetch it with get_content_schema BEFORE writing a checklist / launcher / banner / tracker / resource-center body.
- "Why isn't my content showing?" → diagnose_content. It evaluates the SAME runtime gates the SDK uses (published / user identified / start rules / frequency / session state). Use it before changing targeting blindly.
- End-user data (users / companies / sessions / segments) → these act on ONE environment. A token that can act on multiple environments must pass environmentId; list_environments shows each environment with \`inTokenScope\`.
- Measure effectiveness → get_content_analytics / get_content_question_analytics (defaults to the last 30 days).

Facts that prevent common mistakes:
- A "survey" is a flow with question blocks — there is no separate survey type.
- Content is project-level; PUBLISHING targets one specific environment.
- \`steps\` and list-valued \`data\` fields are FULL replacements, not patches — a member you omit is deleted.
- Lists return { items, nextCursor } — page until nextCursor is null before concluding something does not exist.
- tools/list is scope-gated by this credential: a tool missing from the list is outside its granted scopes, not a missing feature.`;
