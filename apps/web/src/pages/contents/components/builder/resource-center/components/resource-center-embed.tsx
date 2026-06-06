import { BUILDER_Z } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
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
} from '@usertour/widget';
import { ContentEditor, ContentEditorRoot } from '@usertour/editor';
import { useContentListQuery } from '@usertour/hooks';
import {
  ContentDataType,
  ContentEditorElementType,
  type ResourceCenterBlock,
  ResourceCenterBlockType,
  ResourceCenterContentListBlock,
  ResourceCenterRichTextBlock,
  ResourceCenterSubPageBlock,
  type ResourceCenterTab,
} from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useBuilderConfig,
  useEnvironmentId,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useAws } from '@usertour/hooks';

// Inline content editing in the preview is limited to these element types.
const ENABLED_ELEMENT_TYPES = [
  ContentEditorElementType.IMAGE,
  ContentEditorElementType.EMBED,
  ContentEditorElementType.TEXT,
];

// Block ids are unique across the resource center, so a block can be located by
// scanning every tab. Returns the first block matching both id and type.
function findBlock<T extends ResourceCenterBlock>(
  tabs: ResourceCenterTab[],
  id: string,
  type: ResourceCenterBlockType,
): T | undefined {
  for (const tab of tabs) {
    const block = tab.blocks.find((candidate) => candidate.id === id && candidate.type === type);
    if (block) {
      return block as T;
    }
  }
  return undefined;
}

interface ResourceCenterEmbedContentProps {
  messageEditSlots: Record<string, React.ReactNode>;
}

/** Inner panel content that can access the widget's ResourceCenterContext */
const ResourceCenterEmbedContent = (props: ResourceCenterEmbedContentProps) => {
  const { messageEditSlots } = props;
  const { currentPage } = useWidgetResourceCenterContext();
  const { data: localData, updateBlock } = useResourceCenterEditor();
  const { upload } = useAws();
  const projectId = useProjectId();
  const { attributeList } = useAttributeList();

  // Build subPageEditSlot for the currently active sub-page
  const subPageEditSlot = useMemo(() => {
    if (!currentPage || currentPage.type !== ResourceCenterBlockType.SUB_PAGE) {
      return undefined;
    }
    const block = findBlock<ResourceCenterSubPageBlock>(
      localData.tabs,
      currentPage.block.id,
      ResourceCenterBlockType.SUB_PAGE,
    );
    if (!block) {
      return undefined;
    }
    return (
      <ContentEditor
        zIndex={BUILDER_Z.canvas}
        customUploadRequest={upload}
        initialValue={block.content}
        onValueChange={(value: ContentEditorRoot[]) => {
          if (!isEqual(value, block.content)) {
            updateBlock(block.id, { content: value });
          }
        }}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={ENABLED_ELEMENT_TYPES}
      />
    );
  }, [currentPage, localData, upload, updateBlock, projectId, attributeList]);

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
  const { data: localData, updateBlock } = useResourceCenterEditor();
  const { upload } = useAws();
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const [expanded, setExpanded] = useState(true);
  const { shouldShowMadeWith = true } = useBuilderConfig();
  const projectId = useProjectId();
  const environmentId = useEnvironmentId();
  const { attributeList } = useAttributeList();
  const { t } = useTranslation();

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
    for (const flow of flowContents) {
      map.set(flow.id, flow.name || t('contentBuilder.resourceCenter.untitledFlow'));
    }
    for (const checklist of checklistContents) {
      map.set(checklist.id, checklist.name || t('contentBuilder.resourceCenter.untitledChecklist'));
    }
    return map;
  }, [flowContents, checklistContents, t]);

  // Track which content list block is currently active for preview
  const [activeContentListBlockId, setActiveContentListBlockId] = useState<string | null>(null);

  const handleContentListNavigate = useCallback((block: ResourceCenterContentListBlock) => {
    setActiveContentListBlockId(block.id);
  }, []);

  // Derive preview items reactively from localData + activeContentListBlockId
  const previewContentListItems = useMemo(() => {
    if (!activeContentListBlockId) {
      return [];
    }
    const block = findBlock<ResourceCenterContentListBlock>(
      localData.tabs,
      activeContentListBlockId,
      ResourceCenterBlockType.CONTENT_LIST,
    );
    if (!block) {
      return [];
    }
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

  // Build messageEditSlots: one ContentEditor per rich-text block across all tabs
  const messageEditSlots = useMemo(() => {
    const slots: Record<string, React.ReactNode> = {};
    for (const tab of localData.tabs) {
      for (const block of tab.blocks) {
        if (block.type === ResourceCenterBlockType.RICH_TEXT) {
          const richTextBlock = block as ResourceCenterRichTextBlock;
          slots[block.id] = (
            <ContentEditor
              zIndex={BUILDER_Z.canvas}
              customUploadRequest={upload}
              initialValue={richTextBlock.content}
              onValueChange={(value: ContentEditorRoot[]) => {
                if (!isEqual(value, richTextBlock.content)) {
                  updateBlock(block.id, { content: value });
                }
              }}
              projectId={projectId}
              attributes={attributeList}
              enabledElementTypes={ENABLED_ELEMENT_TYPES}
            />
          );
        }
      }
    }
    return slots;
  }, [localData, upload, updateBlock, projectId, attributeList]);

  if (!theme) {
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
