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
  ResourceCenterBlockType,
  ResourceCenterData,
  ThemeTypesSetting,
} from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useEffect, useState } from 'react';

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
