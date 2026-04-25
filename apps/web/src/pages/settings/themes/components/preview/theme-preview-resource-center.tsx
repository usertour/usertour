import {
  ResourceCenterRoot,
  ResourceCenterStyleProvider,
  ResourceCenterPanel,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterTabBar,
  ResourceCenterFooter,
} from '@usertour-packages/widget';
import {
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
  ResourceCenterData,
  ThemeTypesSetting,
} from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useEffect, useState } from 'react';

const richTextWelcome = [
  {
    element: { type: 'group' },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: { type: 'fill' },
          justifyContent: 'justify-start',
          padding: { enabled: true, top: 12, bottom: 4, left: 8, right: 8 },
        },
        children: [
          {
            element: {
              data: [
                { type: 'paragraph', children: [{ bold: true, text: 'Welcome! 👋' }] },
                {
                  type: 'paragraph',
                  children: [{ text: 'Find guides, tutorials, and support resources here.' }],
                },
              ],
              type: 'text',
            },
          },
        ],
      },
    ],
  },
];

const richTextChangelog = [
  {
    element: { type: 'group' },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: { type: 'fill' },
          justifyContent: 'justify-start',
          padding: { enabled: true, top: 12, bottom: 12, left: 8, right: 8 },
        },
        children: [
          {
            element: {
              data: [
                { type: 'paragraph', children: [{ bold: true, text: "What's new" }] },
                {
                  type: 'paragraph',
                  children: [
                    { text: 'Faster onboarding, smarter checklists, and improved analytics.' },
                  ],
                },
                { type: 'paragraph', children: [{ bold: true, text: 'Highlights' }] },
                { type: 'paragraph', children: [{ text: '• Resource Center tabs' }] },
                { type: 'paragraph', children: [{ text: '• Live chat integrations' }] },
                { type: 'paragraph', children: [{ text: '• Theme color customization' }] },
              ],
              type: 'text',
            },
          },
        ],
      },
    ],
  },
];

const defaultResourceCenterPreviewData: ResourceCenterData = {
  buttonText: 'Help',
  headerText: 'Resource Center',
  tabs: [
    // Tab 1 — Home: rich text welcome + actions
    {
      id: 'preview-home-tab',
      name: 'Home',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'home-line',
      blocks: [
        {
          id: 'preview-msg-welcome',
          type: ResourceCenterBlockType.RICH_TEXT,
          content: richTextWelcome as any,
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-divider',
          type: ResourceCenterBlockType.DIVIDER,
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-action-whats-new',
          type: ResourceCenterBlockType.ACTION,
          name: "What's new",
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'gift-line',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-action-docs',
          type: ResourceCenterBlockType.ACTION,
          name: 'Documentation',
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'book-open-fill',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-action-feedback',
          type: ResourceCenterBlockType.ACTION,
          name: 'Send feedback',
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'chat1-line',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
      ],
    },
    // Tab 2 — Guides: content list (auto-expands into the list)
    {
      id: 'preview-guides-tab',
      name: 'Guides',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'play-line',
      blocks: [
        {
          id: 'preview-content-list',
          type: ResourceCenterBlockType.CONTENT_LIST,
          name: [{ type: 'paragraph', children: [{ text: 'Guided tours' }] }],
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'play-line',
          showSearchField: false,
          contentItems: [],
          flowIconSource: LauncherIconSource.BUILTIN,
          flowIconType: 'flow-icon',
          checklistIconSource: LauncherIconSource.BUILTIN,
          checklistIconType: 'checklist-icon',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
      ],
    },
    // Tab 3 — Updates: sub-page changelog (auto-expands into rich text)
    {
      id: 'preview-updates-tab',
      name: 'Updates',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'notification-line',
      blocks: [
        {
          id: 'preview-subpage-updates',
          type: ResourceCenterBlockType.SUB_PAGE,
          name: [{ type: 'paragraph', children: [{ text: "What's new" }] }],
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'notification-line',
          content: richTextChangelog as any,
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
      ],
    },
    // Tab 4 — Help: live chat + FAQ
    {
      id: 'preview-help-tab',
      name: 'Help',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'chat1-line',
      blocks: [
        {
          id: 'preview-live-chat',
          type: ResourceCenterBlockType.LIVE_CHAT,
          name: [{ type: 'paragraph', children: [{ text: 'Chat with support' }] }],
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'chat1-line',
          liveChatProvider: LiveChatProvider.CRISP,
          customLiveChatCode: '',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-action-faq',
          type: ResourceCenterBlockType.ACTION,
          name: 'View FAQ',
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'info-circled',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
      ],
    },
  ] as any,
};

const previewContentListItems = [
  {
    contentId: 'preview-flow-1',
    contentType: 'flow' as const,
    name: 'Getting started',
  },
  {
    contentId: 'preview-flow-2',
    contentType: 'flow' as const,
    name: 'Create your first project',
  },
  {
    contentId: 'preview-flow-3',
    contentType: 'flow' as const,
    name: 'Invite your team',
  },
  {
    contentId: 'preview-checklist-1',
    contentType: 'checklist' as const,
    name: 'Onboarding checklist',
  },
  {
    contentId: 'preview-flow-4',
    contentType: 'flow' as const,
    name: 'Configure integrations',
  },
];

interface ThemePreviewResourceCenterProps {
  expanded?: boolean;
  settings?: ThemeTypesSetting;
}

export const ThemePreviewResourceCenter = (props: ThemePreviewResourceCenterProps) => {
  const { expanded = true, settings } = props;
  const { shouldShowMadeWith } = useSubscriptionContext();

  const [expandedState, setExpandedState] = useState(expanded);

  useEffect(() => {
    setExpandedState(expanded);
  }, [expanded]);

  if (!settings) return null;

  const previewContent = (
    <>
      <ResourceCenterHeader />
      <ResourceCenterBody>
        <ResourceCenterBlocks />
      </ResourceCenterBody>
      <ResourceCenterTabBar />
      <ResourceCenterFooter />
    </>
  );

  return (
    <div className="w-full h-full scale-100">
      <ResourceCenterRoot
        data={defaultResourceCenterPreviewData}
        themeSettings={settings}
        expanded={expandedState}
        onExpandedChange={async (open: boolean) => {
          setExpandedState(open);
        }}
        zIndex={10000}
        showMadeWith={shouldShowMadeWith}
        contentListItems={previewContentListItems}
      >
        <ResourceCenterStyleProvider>
          <ResourceCenterPanel mode="dom" openHeightOverride={600}>
            {previewContent}
          </ResourceCenterPanel>
        </ResourceCenterStyleProvider>
      </ResourceCenterRoot>
    </div>
  );
};

ThemePreviewResourceCenter.displayName = 'ThemePreviewResourceCenter';
