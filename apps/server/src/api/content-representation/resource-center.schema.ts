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
  name: z.string(),
  icon: rcIcon.optional(),
  clickActions: z.array(representationAction).default([]),
});
const rcSubPageBlock = z.object({
  ...blockBase,
  type: z.literal('sub-page'),
  name: z.string(),
  icon: rcIcon.optional(),
  content: z.array(representationBlock).default([]),
});
const rcContentListItem = z.object({
  content: z.string(), // referenced content id
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
  navigateUrl: z.string().optional(),
  navigateOpenType: z.enum(['same', 'new']).optional(),
  onlyShowWhen: z.array(representationCondition).optional(),
});
const rcContentListBlock = z.object({
  ...blockBase,
  type: z.literal('content-list'),
  name: z.string(),
  icon: rcIcon.optional(),
  flowIcon: rcIcon.optional(),
  checklistIcon: rcIcon.optional(),
  showSearchField: z.boolean().optional(),
  items: z.array(rcContentListItem).default([]),
});
const rcLiveChatBlock = z.object({
  ...blockBase,
  type: z.literal('live-chat'),
  name: z.string(),
  icon: rcIcon.optional(),
  provider: z.enum([
    'crisp',
    'custom',
    'freshchat',
    'help-scout',
    'hubspot',
    'intercom',
    'zendesk-classic',
    'zendesk-messenger',
  ]),
  customCode: z.string().optional(),
});
// Navigation entry into the environment's announcement feed. The block carries no
// announcement content — the feed lists every published `announcement` content in
// the environment that passes the user's targeting. Announcement state (feed,
// badge, popup) is global, so a resource center supports AT MOST ONE announcement
// block across all tabs (enforced on write).
const rcAnnouncementBlock = z.object({
  ...blockBase,
  type: z.literal('announcement'),
  name: z.string(),
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
  name: z.string(),
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
  buttonText: z.string().optional(),
  headerText: z.string().optional(),
  tabs: z.array(rcTab).optional(),
});
export type RepresentationResourceCenter = z.infer<typeof representationResourceCenter>;
