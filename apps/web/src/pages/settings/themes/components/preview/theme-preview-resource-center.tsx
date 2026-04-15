import {
  ChecklistDismiss,
  ChecklistItems,
  ChecklistPopperContentBody,
  ChecklistProgress,
  ChecklistRoot,
  ContentEditorSerialize,
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
  ResourceCenterBlockType,
  ResourceCenterData,
  ThemeTypesSetting,
  type ListAnnouncementsResult,
  type AnnouncementDetail,
} from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useCallback, useEffect, useState } from 'react';

// Helper to build a text content block for MESSAGE blocks
const makeTextContent = (paragraphs: Array<{ text: string; bold?: boolean }>) =>
  [
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
                data: paragraphs.map((p) => ({
                  type: 'paragraph',
                  children: [p.bold ? { bold: true, text: p.text } : { text: p.text }],
                })),
                type: 'text',
              },
            },
          ],
        },
      ],
    },
  ] as any;

const defaultResourceCenterPreviewData: ResourceCenterData = {
  buttonText: 'Help',
  headerText: 'Resource Center',
  tabs: [
    {
      id: 'preview-home-tab',
      name: 'Home',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'home-line',
      blocks: [
        {
          id: 'preview-msg-1',
          type: ResourceCenterBlockType.RICH_TEXT,
          content: [
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
                            children: [
                              { text: 'Find guides, tutorials, and support resources here.' },
                            ],
                          },
                        ],
                        type: 'text',
                      },
                    },
                  ],
                },
              ],
            },
          ] as any,
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-checklist',
          type: ResourceCenterBlockType.CHECKLIST,
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
          id: 'preview-action-1',
          type: ResourceCenterBlockType.ACTION,
          name: "What's new",
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'notification-line',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
        {
          id: 'preview-action-2',
          type: ResourceCenterBlockType.ACTION,
          name: 'Send feedback',
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'chat1-line',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
      ],
    },
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
    {
      id: 'preview-news-tab',
      name: 'News',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'notification-line',
      blocks: [
        {
          id: 'preview-announcement',
          type: ResourceCenterBlockType.ANNOUNCEMENT,
          name: [{ type: 'paragraph', children: [{ text: 'Announcements' }] }],
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'megaphone-line',
          onlyShowBlock: false,
          onlyShowBlockConditions: [],
        },
      ],
    },
  ] as any,
};

const previewChecklistData = {
  buttonText: 'Getting started',
  content: [
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
                data: [
                  {
                    type: 'paragraph',
                    children: [{ text: 'Complete these steps to get value quickly.' }],
                  },
                ],
                type: 'text',
              },
            },
          ],
        },
      ],
    },
  ] as any,
  items: [
    {
      id: 'preview-task-1',
      name: 'Install SDK',
      description: 'Add the script to your app',
      type: 'click-and-complete',
      completed: false,
      hidden: false,
      dismiss: false,
    },
    {
      id: 'preview-task-2',
      name: 'Publish content',
      description: 'Ship your first experience',
      type: 'click-and-complete',
      completed: true,
      hidden: false,
      dismiss: false,
    },
  ],
} as any;

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
    contentId: 'preview-checklist-1',
    contentType: 'checklist' as const,
    name: 'Onboarding checklist',
  },
];

const previewAnnouncementItems = [
  {
    id: 'preview-ann-1',
    versionId: 'v1',
    title: 'New dashboard redesign',
    content: makeTextContent([
      { text: 'We have completely redesigned the dashboard for a better experience.' },
    ]),
    moreEnabled: true,
    moreButtonText: 'Read more',
    level: 'badge',
    seen: false,
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview-ann-2',
    versionId: 'v1',
    title: 'API v2 is now available',
    content: makeTextContent([
      { text: 'Check out the new API endpoints and improved performance.' },
    ]),
    moreEnabled: false,
    moreButtonText: 'Read more',
    level: 'silent',
    seen: true,
    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview-ann-3',
    versionId: 'v1',
    title: 'Bug fixes and improvements',
    content: makeTextContent([{ text: 'Various bug fixes and stability improvements.' }]),
    moreEnabled: false,
    moreButtonText: 'Read more',
    level: 'silent',
    seen: true,
    time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
] as any;

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

  const handleListAnnouncements = useCallback(
    async (): Promise<ListAnnouncementsResult> => ({
      announcements: previewAnnouncementItems,
      pageSize: 10,
      truncated: false,
    }),
    [],
  );

  const handleGetAnnouncement = useCallback(
    async (contentId: string): Promise<AnnouncementDetail | null> => {
      const item = previewAnnouncementItems.find((a: any) => a.id === contentId);
      return item ? { ...item, moreContent: null } : null;
    },
    [],
  );

  if (!settings) return null;

  const previewChecklistSlot = (
    <ChecklistRoot
      data={previewChecklistData}
      themeSettings={settings}
      embedded={true}
      expanded={true}
      zIndex={0}
    >
      <ChecklistPopperContentBody>
        <ContentEditorSerialize contents={previewChecklistData.content} />
        <ChecklistProgress />
        <ChecklistItems disabledUpdate={true} />
        <ChecklistDismiss />
      </ChecklistPopperContentBody>
    </ChecklistRoot>
  );

  const previewUncompletedCount = previewChecklistData.items.filter(
    (item: { completed?: boolean; hidden?: boolean }) => item.hidden !== true && !item.completed,
  ).length;
  const previewLauncherUncompletedCount = settings.resourceCenterLauncherButton?.showRemainingTasks
    ? previewUncompletedCount
    : 0;

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
        launcherText={previewChecklistData.buttonText}
        badgeCount={previewUncompletedCount}
        uncompletedCount={previewLauncherUncompletedCount}
        expanded={expandedState}
        onExpandedChange={async (open: boolean) => {
          setExpandedState(open);
        }}
        zIndex={10000}
        showMadeWith={shouldShowMadeWith}
        checklistSlot={previewChecklistSlot}
        contentListItems={previewContentListItems}
        onListAnnouncements={handleListAnnouncements}
        onGetAnnouncement={handleGetAnnouncement}
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
