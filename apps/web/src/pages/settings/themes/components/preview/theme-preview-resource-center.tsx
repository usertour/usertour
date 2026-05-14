import { useRect } from '@usertour/react-use-rect';
import {
  ResourceCenterRoot,
  ResourceCenterStyleProvider,
  ResourceCenterPanel,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterTabBar,
  ResourceCenterFooter,
} from '@usertour/widget';
import {
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
  ResourceCenterData,
  ThemeTypesSetting,
} from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useEffect, useRef, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRect = useRect(containerRef.current);

  useEffect(() => {
    setExpandedState(expanded);
  }, [expanded]);

  if (!settings) return null;

  // Cap preview panel height to the available canvas so it doesn't overflow
  // the simulated browser frame. We honor settings.resourceCenter.maxHeight
  // up to the container height (minus offset + launcher); above that, the
  // preview saturates at the container's available space. At runtime,
  // 100vh is the actual browser viewport, so the cap doesn't apply there.
  const offsetY = settings.resourceCenter?.offsetY ?? 20;
  const launcherHeight = settings.resourceCenterLauncherButton?.height ?? 60;
  const maxHeightSetting = settings.resourceCenter?.maxHeight ?? 700;
  const availableHeight = containerRect
    ? Math.max(containerRect.height - offsetY * 2 - launcherHeight - 4, 200)
    : 600;
  const previewHeight = Math.min(maxHeightSetting, availableHeight);

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
    <div ref={containerRef} className="w-full h-full scale-100">
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
          {/*
           * openHeightOverride uses min(maxHeightSetting, availableHeight)
           * so the preview reacts when the user edits maxHeight (up to
           * the simulated browser's available space) without overflowing
           * the canvas. Previously a hard-coded 600 short-circuited the
           * setting entirely; now small values shrink and large values
           * saturate at the canvas height.
           */}
          <ResourceCenterPanel mode="dom" openHeightOverride={previewHeight}>
            {previewContent}
          </ResourceCenterPanel>
        </ResourceCenterStyleProvider>
      </ResourceCenterRoot>
    </div>
  );
};

ThemePreviewResourceCenter.displayName = 'ThemePreviewResourceCenter';
