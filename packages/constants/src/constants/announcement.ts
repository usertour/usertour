import {
  AnnouncementDistribution,
  AnnouncementPopupStyle,
  ContentEditorElementType,
} from '@usertour/types';
import type {
  AnnouncementData,
  AnnouncementPopupConfig,
  AnnouncementSeenSource,
  ContentEditorRoot,
} from '@usertour/types';

const DEFAULT_EDITOR_CONTENT: ContentEditorRoot[] = [
  {
    element: { type: ContentEditorElementType.GROUP },
    children: [
      {
        element: {
          type: ContentEditorElementType.COLUMN,
          style: {},
          width: { type: 'fill' },
          justifyContent: 'justify-start',
        },
        children: [
          {
            element: {
              data: [{ type: 'paragraph', children: [{ text: '' }] }],
              type: ContentEditorElementType.TEXT,
            },
            children: null,
          },
        ],
      },
    ],
  },
];

export const DEFAULT_ANNOUNCEMENT_DATA: AnnouncementData = {
  title: '',
  introContent: DEFAULT_EDITOR_CONTENT,
  enableReadMore: false,
  readMoreLabel: 'Read more',
  detailContent: DEFAULT_EDITOR_CONTENT,
  distribution: AnnouncementDistribution.BADGE,
};

export const DEFAULT_POPUP_CONFIG: AnnouncementPopupConfig = {
  style: AnnouncementPopupStyle.BUBBLE,
};

/**
 * Surfaces that may mark an announcement seen, recorded on the ANNOUNCEMENT_SEEN
 * event. Single source for the payload validator (@IsIn) and the handler's
 * whitelist so neither drifts from the AnnouncementSeenSource type.
 */
export const ANNOUNCEMENT_SEEN_SOURCES: readonly AnnouncementSeenSource[] = [
  'resource_center',
  'modal',
  'bubble',
];

/**
 * Newest N published announcements considered for the feed / badge / seen scan.
 * Bounds the feed query, the targeting evaluation, and the mark-seen payload
 * size so they can't drift apart.
 *
 * Also the ceiling of the unread count: the widget's badge UIs (launcher
 * badge, block-row badge, tab badge) render the raw number sized for at most
 * two digits — raising this past 99 would silently overflow the fixed-size
 * circles.
 */
export const ANNOUNCEMENT_FEED_SCAN_LIMIT = 50;
