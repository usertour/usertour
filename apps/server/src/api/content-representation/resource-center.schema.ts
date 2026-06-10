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

const rcIcon = z.object({
  source: z.enum(['none', 'builtin', 'upload', 'url', 'inherit']).optional(),
  type: z.string().optional(),
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
  icon: rcIcon.optional(),
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

const rcBlock = z.discriminatedUnion('type', [
  rcRichTextBlock,
  rcDividerBlock,
  rcActionBlock,
  rcSubPageBlock,
  rcContentListBlock,
  rcLiveChatBlock,
]);
export type RepresentationResourceCenterBlock = z.infer<typeof rcBlock>;

const rcTab = z.object({
  id: z.string().optional(),
  name: z.string(),
  icon: rcIcon.optional(),
  blocks: z.array(rcBlock).default([]),
});

export const representationResourceCenter = z.object({
  buttonText: z.string().optional(),
  headerText: z.string().optional(),
  tabs: z.array(rcTab).optional(),
});
export type RepresentationResourceCenter = z.infer<typeof representationResourceCenter>;
