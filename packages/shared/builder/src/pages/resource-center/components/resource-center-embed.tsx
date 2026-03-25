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
  ResourceCenterContainer,
  ResourceCenterStaticPopper,
  ResourceCenterPopperContent,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterFooter,
} from '@usertour-packages/widget';
import { ContentEditor, ContentEditorRoot } from '@usertour-packages/shared-editor';
import {
  ContentEditorElementType,
  ResourceCenterBlockType,
  ResourceCenterMessageBlock,
  Theme,
} from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBuilderContext, useResourceCenterContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';

export const ResourceCenterEmbed = () => {
  const { localData, updateBlock } = useResourceCenterContext();
  const { upload } = useAws();
  const [theme, setTheme] = useState<Theme | undefined>();
  const { themeList } = useThemeListContext();
  const { currentVersion, projectId, shouldShowMadeWith = true } = useBuilderContext();
  const { attributeList } = useAttributeListContext();

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

  return (
    <ResourceCenterRoot
      data={localData}
      themeSettings={theme.settings}
      expanded={true}
      onExpandedChange={async () => {}}
      zIndex={10000}
      showMadeWith={shouldShowMadeWith}
      checklistSlot={previewChecklistSlot}
    >
      <ResourceCenterContainer>
        <ResourceCenterStaticPopper>
          <ResourceCenterPopperContent>
            <ResourceCenterHeader text={localData.headerText} />
            <ResourceCenterBody>
              <ResourceCenterBlocks messageEditSlots={messageEditSlots} />
            </ResourceCenterBody>
            <ResourceCenterFooter />
          </ResourceCenterPopperContent>
        </ResourceCenterStaticPopper>
      </ResourceCenterContainer>
    </ResourceCenterRoot>
  );
};

ResourceCenterEmbed.displayName = 'ResourceCenterEmbed';
