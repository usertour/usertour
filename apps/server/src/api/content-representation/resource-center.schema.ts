import { z } from 'zod';

import {
  representationAction,
  representationBlock,
  representationCondition,
} from './representation.schema';

/**
 * Representation of a resource-center version body — its own block taxonomy
 * (distinct from the step/flow blocks). A resource center is `buttonText` +
 * `headerText` + tabs, each tab a list of typed blocks. Reuses the shared leaf
 * codecs: rich content → block codec, conditions/actions → rules codec, rich-text
 * labels → text codec. `id` on tabs / blocks / items is the server-owned merge key
 * (round-trips on read; omit for new). `onlyShowWhen` present ⇒ the block/item is
 * conditionally shown.
 */

const rcIconType = z
  .string()
  .optional()
  .describe(
    "Builtin icon name (when source='builtin'): a RemixIcon name in kebab `-line`/`-fill` style — " +
      'e.g. `home-line`, `question-line`, `chat-line`, `settings-line`, `rocket`. ' +
      'NOT lucide names: `help-circle` / `sparkles` / `book-open` / `message-circle` are not in ' +
      "the set and render nothing (silent, no error). Unsure of a name? Use source='none' rather " +
      'than guess. Common names + an intent→name table are in get_authoring_guide.',
  );

const rcIcon = z.object({
  source: z
    .enum(['none', 'builtin', 'upload', 'url'])
    .optional()
    .describe(
      "Icon source. 'builtin' = a named icon from the bundled RemixIcon set (see `type`); " +
        "'upload'/'url' = a custom image via `url`; 'none' = no icon.",
    ),
  type: rcIconType,
  url: z.string().optional(),
});

// Content-list ITEMS additionally accept 'inherit' — fall back to the block's
// flow/checklist default icon. Only meaningful there: on a tab or block an
// 'inherit' icon has nothing to inherit from and renders empty, so the plain
// rcIcon (no 'inherit') gates those positions.
const rcItemIcon = z.object({
  source: z
    .enum(['none', 'builtin', 'upload', 'url', 'inherit'])
    .optional()
    .describe(
      "Icon source. 'inherit' (default) falls back to the block's flowIcon/checklistIcon; " +
        "'builtin' = a named RemixIcon (see `type`); 'upload'/'url' = a custom image; 'none' = no icon.",
    ),
  type: rcIconType,
  url: z.string().optional(),
});

const blockBase = {
  id: z.string().optional(),
  onlyShowWhen: z.array(representationCondition).optional(),
};

/** Rendered block labels go through the plain-text codec, so they interpolate. */
const rcBlockName = z
  .string()
  .describe(
    'Visible label of this block row. Supports `{{ attribute_code | default: "x" }}` user-attribute interpolation.',
  );

const rcRichTextBlock = z.object({
  ...blockBase,
  type: z.literal('richtext'),
  name: z.string().optional(),
  content: z.array(representationBlock).default([]),
});
const rcDividerBlock = z.object({
  ...blockBase,
  type: z.literal('divider'),
  name: z.string().optional(),
});
const rcActionBlock = z.object({
  ...blockBase,
  type: z.literal('action'),
  name: rcBlockName,
  icon: rcIcon.optional(),
  clickActions: z.array(representationAction).default([]),
});
const rcSubPageBlock = z.object({
  ...blockBase,
  type: z.literal('sub-page'),
  name: rcBlockName,
  icon: rcIcon.optional(),
  content: z.array(representationBlock).default([]),
});
const rcContentListItem = z.object({
  content: z.string().describe('Id of the flow/checklist this entry starts on click.'),
  contentType: z.enum(['flow', 'checklist']),
  label: z
    .string()
    .optional()
    .describe(
      "Display name for this list entry; omitted or empty falls back to the referenced content's " +
        'admin name. `items` is a full-list replacement — when rewriting it, echo the read-back ' +
        '`label` or it is cleared.',
    ),
  icon: rcItemIcon.optional(),
  navigateUrl: z
    .string()
    .optional()
    .describe(
      'URL also opened when the entry is clicked, AFTER the referenced content starts — e.g. ' +
        'take the user to the page where the flow begins. Supports `{{ attribute_code | ' +
        'default: "x" }}` interpolation.',
    ),
  navigateOpenType: z
    .enum(['same', 'new'])
    .optional()
    .describe('Open `navigateUrl` in the same tab (default) or a new one.'),
  onlyShowWhen: z.array(representationCondition).optional(),
});
const rcContentListBlock = z.object({
  ...blockBase,
  type: z.literal('content-list'),
  name: rcBlockName,
  icon: rcIcon.optional(),
  flowIcon: rcIcon.optional(),
  checklistIcon: rcIcon.optional(),
  showSearchField: z.boolean().optional(),
  items: z.array(rcContentListItem).default([]),
});
const rcLiveChatBlock = z.object({
  ...blockBase,
  type: z.literal('live-chat'),
  name: rcBlockName,
  icon: rcIcon.optional(),
  provider: z
    .enum([
      'crisp',
      'custom',
      'freshchat',
      'help-scout',
      'hubspot',
      'intercom',
      'zendesk-classic',
      'zendesk-messenger',
    ])
    .describe(
      'Which chat widget the click opens. The SDK only INVOKES the provider — the host page must ' +
        "already have that provider's script installed, or clicking logs a console warning and " +
        'nothing opens. Not checkable at write time (the server cannot see the host page), so ' +
        'confirm which provider the host actually runs.',
    ),
  customCode: z
    .string()
    .optional()
    .describe(
      "Only meaningful — and only RETURNED — when provider is 'custom': the script run on CLICK " +
        '(not page load) via new Function; hosts can disable it with usertour.disableEvalJs(). ' +
        'Echo-only via the API — echo the stored code back unchanged (or omit the field) to keep ' +
        'it, empty string clears it; writing new or edited code is rejected (same security policy ' +
        'as run_javascript). Author scripts in the builder. For other providers the field never ' +
        'appears in reads; any leftover script from a past provider switch stays stored and ' +
        'resurfaces if the provider returns to custom.',
    ),
});
// Navigation entry into the environment's announcement feed. The block carries no
// announcement content — the feed lists every published `announcement` content in
// the environment that passes the user's targeting. Announcement state (feed,
// badge, popup) is global, so a resource center supports AT MOST ONE announcement
// block across all tabs (enforced on write).
const rcAnnouncementBlock = z.object({
  ...blockBase,
  type: z.literal('announcement'),
  name: rcBlockName,
  icon: rcIcon.optional(),
});
// Echo-only: a stored block kind this API version cannot express. Read-backs mark
// it honestly instead of mislabeling it; write it back UNCHANGED (with its `id`)
// to preserve it — authoring a new one is rejected.
const rcUnsupportedBlock = z.object({
  ...blockBase,
  type: z.literal('unsupported'),
  note: z.string().optional(),
});

const rcBlock = z.discriminatedUnion('type', [
  rcRichTextBlock,
  rcDividerBlock,
  rcActionBlock,
  rcSubPageBlock,
  rcContentListBlock,
  rcLiveChatBlock,
  rcAnnouncementBlock,
  rcUnsupportedBlock,
]);
export type RepresentationResourceCenterBlock = z.infer<typeof rcBlock>;

const rcTab = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .describe('Tab label. Plain text — NO `{{ }}` interpolation (braces would render literally).'),
  icon: rcIcon.optional(),
  blocks: z
    .array(rcBlock)
    .default([])
    .describe(
      'Tab blocks use the resource-center vocabulary — richtext / divider / action / sub-page / ' +
        'content-list / live-chat / announcement — NOT the flow content blocks. Put text inside ' +
        'a `richtext` block: { "type": "richtext", "content": [{ "object": "block", "type": ' +
        '"text", "markdown": "…" }] }. A bare top-level text block (type "text") is rejected ' +
        'here. At most one `announcement` block per resource center (across all tabs).',
    ),
});

export const representationResourceCenter = z.object({
  buttonText: z
    .string()
    .optional()
    .describe(
      'Text on the floating resource-center launcher (only rendered when the theme launcher is ' +
        'in text mode). Plain string — NO `{{ }}` interpolation.',
    ),
  headerText: z
    .string()
    .optional()
    .describe(
      'Panel header title on the home view. Plain string — NO `{{ }}` interpolation (braces ' +
        'would render literally); for a personalized greeting use a `richtext` block instead.',
    ),
  tabs: z.array(rcTab).optional(),
});
export type RepresentationResourceCenter = z.infer<typeof representationResourceCenter>;
