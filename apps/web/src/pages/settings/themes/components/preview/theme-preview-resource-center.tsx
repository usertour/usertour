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
  ResourceCenterFooter,
} from '@usertour-packages/widget';
import { ResourceCenterBlockType, ResourceCenterData, ThemeTypesSetting } from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';
import { useEffect, useState } from 'react';

const defaultResourceCenterPreviewData: ResourceCenterData = {
  buttonText: 'Help',
  headerText: 'Resource Center',
  blocks: [
    {
      id: 'preview-msg-1',
      type: ResourceCenterBlockType.MESSAGE,
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
                        children: [
                          {
                            bold: true,
                            text: 'Welcome! 👋',
                          },
                        ],
                      },
                      {
                        type: 'paragraph',
                        children: [
                          {
                            text: 'Find guides, tutorials, and support resources here.',
                          },
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
                        children: [
                          {
                            text: '📖 Browse our knowledge base for answers.',
                          },
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
      onlyShowTask: false,
      onlyShowTaskConditions: [],
    },
  ],
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
      <ResourceCenterHeader text={defaultResourceCenterPreviewData.headerText} />
      <ResourceCenterBody>
        <ResourceCenterBlocks />
      </ResourceCenterBody>
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
