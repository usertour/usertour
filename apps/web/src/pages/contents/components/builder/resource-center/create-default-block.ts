import {
  type ContentEditorRoot,
  LauncherIconSource,
  LiveChatProvider,
  type ResourceCenterBlock,
  ResourceCenterBlockType,
} from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';

const DEFAULT_MESSAGE_BLOCK_CONTENT = [
  {
    element: { type: 'group' },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: { type: 'fill' },
          justifyContent: 'justify-start',
        },
        children: [
          {
            element: {
              data: [{ type: 'paragraph', children: [{ text: '' }] }],
              type: 'text',
            },
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

// Build a fresh block of the given type for the new-block sub-view. The draft
// only lands in the tab on save (mirrors flow's defaultStep / checklist's
// defaultChecklistItem).
export const createDefaultBlock = (type: ResourceCenterBlockType): ResourceCenterBlock | null => {
  const id = uuidV4();
  switch (type) {
    case ResourceCenterBlockType.RICH_TEXT:
      return {
        id,
        type: ResourceCenterBlockType.RICH_TEXT,
        content: DEFAULT_MESSAGE_BLOCK_CONTENT,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.DIVIDER:
      return {
        id,
        type: ResourceCenterBlockType.DIVIDER,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.ACTION:
      return {
        id,
        type: ResourceCenterBlockType.ACTION,
        name: [{ type: 'paragraph', children: [{ text: 'Action button' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'arrow-right-circle-fill',
        clickedActions: [],
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.SUB_PAGE:
      return {
        id,
        type: ResourceCenterBlockType.SUB_PAGE,
        name: [{ type: 'paragraph', children: [{ text: 'Sub-page' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'pages-fill',
        content: DEFAULT_MESSAGE_BLOCK_CONTENT,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.CONTENT_LIST:
      return {
        id,
        type: ResourceCenterBlockType.CONTENT_LIST,
        name: [{ type: 'paragraph', children: [{ text: 'Guided tours' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'list-check3',
        flowIconSource: LauncherIconSource.BUILTIN,
        flowIconType: 'flow-icon',
        checklistIconSource: LauncherIconSource.BUILTIN,
        checklistIconType: 'checklist-icon',
        showSearchField: true,
        contentItems: [],
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.LIVE_CHAT:
      return {
        id,
        type: ResourceCenterBlockType.LIVE_CHAT,
        name: [{ type: 'paragraph', children: [{ text: 'Ask a question' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'message3-fill',
        liveChatProvider: LiveChatProvider.CRISP,
        customLiveChatCode: '',
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    default:
      return null;
  }
};
