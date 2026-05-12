import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useAttributeListContext, useThemeListContext } from '@usertour-packages/contexts';
import {
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
import { ContentEditor, ContentEditorRoot } from '@usertour-packages/shared-editor';
import { useContentListQuery } from '@usertour-packages/shared-hooks';
import {
  ContentDataType,
  ContentEditorElementType,
  ResourceCenterBlockType,
  ResourceCenterContentListBlock,
  ResourceCenterRichTextBlock,
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
  const { currentPage } = useWidgetResourceCenterContext();
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
    if (!currentPage || currentPage.type !== ResourceCenterBlockType.SUB_PAGE || !localData)
      return undefined;
    // Find the block across all tabs
    let block: ResourceCenterSubPageBlock | undefined;
    for (const tab of localData.tabs) {
      block = tab.blocks.find(
        (b) => b.id === currentPage.block.id && b.type === ResourceCenterBlockType.SUB_PAGE,
      ) as ResourceCenterSubPageBlock | undefined;
      if (block) break;
    }
    if (!block) return undefined;
    return (
      <ContentEditor
        zIndex={EXTENSION_CONTENT_POPPER}
        customUploadRequest={handleCustomUploadRequest}
        initialValue={block.content}
        onValueChange={(value: ContentEditorRoot[]) => {
          if (!isEqual(value, block!.content)) {
            updateBlock(block!.id, { content: value } as any);
          }
        }}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={enabledElementTypes}
      />
    );
  }, [currentPage, localData, handleCustomUploadRequest, updateBlock, projectId, attributeList]);

  return (
    <>
      <ResourceCenterHeader />
      <ResourceCenterBody>
        <ResourceCenterBlocks
          messageEditSlots={messageEditSlots}
          subPageEditSlot={subPageEditSlot}
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

  // Build a name lookup map for flows and checklists
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
  const [activeContentListBlockId, setActiveContentListBlockId] = useState<string | null>(null);

  const handleContentListNavigate = useCallback((block: ResourceCenterContentListBlock) => {
    setActiveContentListBlockId(block.id);
  }, []);

  // Derive preview items reactively from localData + activeContentListBlockId
  const previewContentListItems = useMemo(() => {
    if (!activeContentListBlockId || !localData) return [];
    let block: ResourceCenterContentListBlock | undefined;
    for (const tab of localData.tabs) {
      const found = tab.blocks.find(
        (b) => b.id === activeContentListBlockId && b.type === ResourceCenterBlockType.CONTENT_LIST,
      );
      if (found) {
        block = found as ResourceCenterContentListBlock;
        break;
      }
    }
    if (!block) return [];
    return block.contentItems
      .filter((item) => contentNameMap.has(item.contentId))
      .map((item) => ({
        contentId: item.contentId,
        contentType: item.contentType,
        name: contentNameMap.get(item.contentId) || '',
        iconSource: item.iconSource,
        iconType: item.iconType,
        iconUrl: item.iconUrl,
      }));
  }, [activeContentListBlockId, localData, contentNameMap]);

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

  // Build messageEditSlots: one ContentEditor per MESSAGE block across all tabs
  const messageEditSlots = useMemo(() => {
    if (!localData) return {};
    const slots: Record<string, React.ReactNode> = {};
    for (const tab of localData.tabs) {
      for (const block of tab.blocks) {
        if (block.type === ResourceCenterBlockType.RICH_TEXT) {
          const richTextBlock = block as ResourceCenterRichTextBlock;
          slots[block.id] = (
            <ContentEditor
              zIndex={EXTENSION_CONTENT_POPPER}
              customUploadRequest={handleCustomUploadRequest}
              initialValue={richTextBlock.content}
              onValueChange={(value: ContentEditorRoot[]) => {
                if (!isEqual(value, richTextBlock.content)) {
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
    }
    return slots;
  }, [localData, handleCustomUploadRequest, updateBlock, projectId, attributeList]);

  if (!theme || !localData) {
    return null;
  }

  return (
    <ResourceCenterRoot
      data={localData}
      themeSettings={theme.settings}
      animateFrame={false}
      expanded={expanded}
      onExpandedChange={async (open: boolean) => {
        setExpanded(open);
      }}
      zIndex={10000}
      showMadeWith={shouldShowMadeWith}
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
