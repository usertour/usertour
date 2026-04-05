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
} from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useEffect, useState } from 'react';

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
  blocks: [
    {
      id: 'preview-msg-1',
      type: ResourceCenterBlockType.MESSAGE,
      content: makeTextContent([
        { text: 'Welcome! 👋', bold: true },
        { text: 'Find guides, tutorials, and support resources here.' },
      ]),
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-checklist',
      type: ResourceCenterBlockType.CHECKLIST,
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-msg-2',
      type: ResourceCenterBlockType.MESSAGE,
      content: makeTextContent([{ text: 'Browse our knowledge base for answers.' }]),
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-divider',
      type: ResourceCenterBlockType.DIVIDER,
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-action-1',
      type: ResourceCenterBlockType.ACTION,
      name: "What's new",
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'notification-line',
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-action-2',
      type: ResourceCenterBlockType.ACTION,
      name: 'Send feedback',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'chat1-line',
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    // Tab bar blocks (showInTabBar: true)
    {
      id: 'preview-subpage',
      type: ResourceCenterBlockType.SUB_PAGE,
      name: 'Sub page',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'file-text-line',
      content: makeTextContent([{ text: 'Sub page content preview.' }]),
      showInHome: false,
      showInTabBar: true,
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-content-list',
      type: ResourceCenterBlockType.CONTENT_LIST,
      name: 'Guided tours',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'play-line',
      showSearchField: false,
      contentItems: [],
      showInHome: false,
      showInTabBar: true,
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
    {
      id: 'preview-kb',
      type: ResourceCenterBlockType.KNOWLEDGE_BASE,
      name: 'Help',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'question-line',
      searchProvider: 'google' as any,
      knowledgeBaseUrl: '',
      defaultSearchQuery: '',
      showInHome: false,
      showInTabBar: true,
      onlyShowTask: false,
      onlyShowTaskConditions: [],
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
      >
        <ResourceCenterStyleProvider>
          <ResourceCenterPanel mode="dom">{previewContent}</ResourceCenterPanel>
        </ResourceCenterStyleProvider>
      </ResourceCenterRoot>
    </div>
  );
};

ThemePreviewResourceCenter.displayName = 'ThemePreviewResourceCenter';
