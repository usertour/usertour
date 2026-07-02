import {
  AnnouncementDistribution,
  AnnouncementPopupStyle,
  ContentEditorElementType,
} from '@usertour/types';
import type { AnnouncementData, AnnouncementPopupConfig, ContentEditorRoot } from '@usertour/types';

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

export const DEFAULT_POPUP_MODAL_WIDTH = 480;

export const DEFAULT_POPUP_CONFIG: AnnouncementPopupConfig = {
  style: AnnouncementPopupStyle.BUBBLE,
  modalWidth: DEFAULT_POPUP_MODAL_WIDTH,
};
