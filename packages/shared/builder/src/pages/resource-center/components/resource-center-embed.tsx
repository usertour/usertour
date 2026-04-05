import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useAttributeListContext, useThemeListContext } from '@usertour-packages/contexts';
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
  useResourceCenterContext as useWidgetResourceCenterContext,
} from '@usertour-packages/widget';
import type { ContentListDisplayItem } from '@usertour-packages/widget';
import { ContentEditor, ContentEditorRoot } from '@usertour-packages/shared-editor';
import { useContentListQuery } from '@usertour-packages/shared-hooks';
import {
  ContentDataType,
  ContentEditorElementType,
  ResourceCenterBlockType,
  ResourceCenterContactBlock,
  ResourceCenterContentListBlock,
  ResourceCenterMessageBlock,
  ResourceCenterSubPageBlock,
  Theme,
} from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBuilderContext, useResourceCenterContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';

/** Inner panel content that can access the widget's ResourceCenterContext */
const ResourceCenterEmbedContent = ({
  messageEditSlots,
}: {
  messageEditSlots: Record<string, React.ReactNode>;
}) => {
  const { activeSubPage, activeContactPage } = useWidgetResourceCenterContext();
  const { localData, updateBlock } = useResourceCenterContext();
  const { upload } = useAws();
  const { projectId } = useBuilderContext();
  const { attributeList } = useAttributeListContext();

  const handleCustomUploadRequest = useCallback(
    (file: File): Promise<string> => upload(file),
    [upload],
  );

  const enabledElementTypes = [
    ContentEditorElementType.IMAGE,
    ContentEditorElementType.EMBED,
    ContentEditorElementType.TEXT,
  ];

  // Build subPageEditSlot for the currently active sub-page
  const subPageEditSlot = useMemo(() => {
    if (!activeSubPage || !localData) return undefined;
    const block = localData.blocks.find(
      (b) => b.id === activeSubPage.id && b.type === ResourceCenterBlockType.SUB_PAGE,
    ) as ResourceCenterSubPageBlock | undefined;
    if (!block) return undefined;
    return (
      <ContentEditor
        zIndex={EXTENSION_CONTENT_POPPER}
        customUploadRequest={handleCustomUploadRequest}
        initialValue={block.content}
        onValueChange={(value: ContentEditorRoot[]) => {
          if (!isEqual(value, block.content)) {
            updateBlock(block.id, { content: value } as any);
          }
        }}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={enabledElementTypes}
      />
    );
  }, [activeSubPage, localData, handleCustomUploadRequest, updateBlock, projectId, attributeList]);

  // Build contactPageEditSlot for the currently active contact email/phone page
  const contactPageEditSlot = useMemo(() => {
    if (!activeContactPage || !localData) return undefined;
    const block = localData.blocks.find(
      (b) => b.id === activeContactPage.block.id && b.type === ResourceCenterBlockType.CONTACT,
    ) as ResourceCenterContactBlock | undefined;
    if (!block) return undefined;
    const contentField = activeContactPage.page === 'email' ? 'emailContent' : 'phoneContent';
    return (
      <ContentEditor
        zIndex={EXTENSION_CONTENT_POPPER}
        customUploadRequest={handleCustomUploadRequest}
        initialValue={block[contentField]}
        onValueChange={(value: ContentEditorRoot[]) => {
          if (!isEqual(value, block[contentField])) {
            updateBlock(block.id, { [contentField]: value } as any);
          }
        }}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={enabledElementTypes}
      />
    );
  }, [
    activeContactPage,
    localData,
    handleCustomUploadRequest,
    updateBlock,
    projectId,
    attributeList,
  ]);

  return (
    <>
      <ResourceCenterHeader />
      <ResourceCenterBody>
        <ResourceCenterBlocks
          messageEditSlots={messageEditSlots}
          subPageEditSlot={subPageEditSlot}
          contactPageEditSlot={contactPageEditSlot}
        />
      </ResourceCenterBody>
      <ResourceCenterTabBar />
      <ResourceCenterFooter />
    </>
  );
};

export const ResourceCenterEmbed = () => {
  const { localData, updateBlock } = useResourceCenterContext();
  const { upload } = useAws();
  const [theme, setTheme] = useState<Theme | undefined>();
  const [expanded, setExpanded] = useState(true);
  const { themeList } = useThemeListContext();
  const {
    currentVersion,
    projectId,
    environmentId,
    shouldShowMadeWith = true,
  } = useBuilderContext();
  const { attributeList } = useAttributeListContext();

  // Query flows and checklists for content list block preview
  const { contents: flowContents } = useContentListQuery({
    query: { environmentId, type: ContentDataType.FLOW },
  });
  const { contents: checklistContents } = useContentListQuery({
    query: { environmentId, type: ContentDataType.CHECKLIST },
  });

  // Build a name lookup map for all content
  const contentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of flowContents) {
      map.set(c.id, c.name || 'Untitled flow');
    }
    for (const c of checklistContents) {
      map.set(c.id, c.name || 'Untitled checklist');
    }
    return map;
  }, [flowContents, checklistContents]);

  // Track which content list block is currently active for preview
  const [previewContentListItems, setPreviewContentListItems] = useState<ContentListDisplayItem[]>(
    [],
  );

  const handleContentListNavigate = useCallback(
    (block: ResourceCenterContentListBlock) => {
      const items: ContentListDisplayItem[] = block.contentItems
        .filter((item) => contentNameMap.has(item.contentId))
        .map((item) => ({
          contentId: item.contentId,
          contentType: item.contentType,
          name: contentNameMap.get(item.contentId) || '',
        }));
      setPreviewContentListItems(items);
    },
    [contentNameMap],
  );

  useEffect(() => {
    if (!themeList) {
      return;
    }
    if (themeList.length > 0) {
      let theme: Theme | undefined;
      if (currentVersion?.themeId) {
        theme = themeList.find((item) => item.id === currentVersion.themeId);
      } else {
        theme = themeList.find((item) => item.isDefault);
      }
      if (theme) {
        setTheme(theme);
      }
    }
  }, [themeList, currentVersion]);

  const handleCustomUploadRequest = useCallback(
    (file: File): Promise<string> => upload(file),
    [upload],
  );

  const enabledElementTypes = [
    ContentEditorElementType.IMAGE,
    ContentEditorElementType.EMBED,
    ContentEditorElementType.TEXT,
  ];

  // Build messageEditSlots: one ContentEditor per MESSAGE block
  const messageEditSlots = useMemo(() => {
    if (!localData) return {};
    const slots: Record<string, React.ReactNode> = {};
    for (const block of localData.blocks) {
      if (block.type === ResourceCenterBlockType.MESSAGE) {
        const msgBlock = block as ResourceCenterMessageBlock;
        slots[block.id] = (
          <ContentEditor
            zIndex={EXTENSION_CONTENT_POPPER}
            customUploadRequest={handleCustomUploadRequest}
            initialValue={msgBlock.content}
            onValueChange={(value: ContentEditorRoot[]) => {
              if (!isEqual(value, msgBlock.content)) {
                updateBlock(block.id, { content: value } as any);
              }
            }}
            projectId={projectId}
            attributes={attributeList}
            enabledElementTypes={enabledElementTypes}
          />
        );
      }
    }
    return slots;
  }, [localData, handleCustomUploadRequest, updateBlock, projectId, attributeList]);

  if (!theme || !localData) {
    return null;
  }

  const previewChecklistSlot = (
    <ChecklistRoot
      data={
        {
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
        } as any
      }
      themeSettings={theme.settings}
      embedded={true}
      expanded={true}
      zIndex={0}
    >
      <ChecklistPopperContentBody>
        <ContentEditorSerialize
          contents={
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
            ] as any
          }
        />
        <ChecklistProgress />
        <ChecklistItems disabledUpdate={true} />
        <ChecklistDismiss />
      </ChecklistPopperContentBody>
    </ChecklistRoot>
  );

  const previewUncompletedCount = 1;
  const previewLauncherUncompletedCount = theme.settings.resourceCenterLauncherButton
    ?.showRemainingTasks
    ? previewUncompletedCount
    : 0;

  return (
    <ResourceCenterRoot
      data={localData}
      themeSettings={theme.settings}
      launcherText="Getting started"
      badgeCount={0}
      uncompletedCount={previewLauncherUncompletedCount}
      animateFrame={false}
      expanded={expanded}
      onExpandedChange={async (open: boolean) => {
        setExpanded(open);
      }}
      zIndex={10000}
      showMadeWith={shouldShowMadeWith}
      checklistSlot={previewChecklistSlot}
      contentListItems={previewContentListItems}
      onContentListNavigate={handleContentListNavigate}
    >
      <ResourceCenterStyleProvider>
        <ResourceCenterPanel mode="dom" allowOverflow>
          <ResourceCenterEmbedContent messageEditSlots={messageEditSlots} />
        </ResourceCenterPanel>
      </ResourceCenterStyleProvider>
    </ResourceCenterRoot>
  );
};

ResourceCenterEmbed.displayName = 'ResourceCenterEmbed';
