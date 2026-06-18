import { BUILDER_Z } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useChecklistPreviewAnimation } from '@usertour/hooks';
import {
  ChecklistContainer,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopper,
  ChecklistPopperContent,
  ChecklistPopperContentBody,
  ChecklistProgress,
  ChecklistRoot,
  PopperMadeWith,
} from '@usertour/widget';
import { ContentEditor, ContentEditorRoot } from '@usertour/editor';
import { ChecklistInitialDisplay, ContentEditorElementType } from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBuilderConfig, useProjectId } from '@/pages/contents/components/builder/core';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useOembedInfo } from '@/pages/contents/components/builder/hooks/use-oembed-info';
import { useAws } from '@usertour/hooks';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';

export const ChecklistEmbed = () => {
  const { data: localData, currentItem, updateData: updateLocalData } = useChecklistEditor();
  const { upload } = useAws();
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const { shouldShowMadeWith = true } = useBuilderConfig();
  const projectId = useProjectId();
  const [expanded, setExpanded] = useState(
    localData.initialDisplay === ChecklistInitialDisplay.EXPANDED,
  );
  const { attributeList } = useAttributeList();
  const getOembedInfo = useOembedInfo();

  // Use shared hook for animation and completion state management
  const { completedItemIds, animatedItemIds, handleItemClick } =
    useChecklistPreviewAnimation(expanded);

  useEffect(() => {
    setExpanded(localData.initialDisplay === ChecklistInitialDisplay.EXPANDED);
  }, [localData.initialDisplay]);

  const handleContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (!isEqual(value, localData.content)) {
        updateLocalData({ content: value });
      }
    },
    [localData, updateLocalData],
  );

  // Compute items with completed and animation state using useMemo
  const items = useMemo(() => {
    return localData.items.map((item) => {
      const newItem = item.id === currentItem?.id ? currentItem : item;
      return {
        ...newItem,
        isVisible: true,
        isCompleted: completedItemIds.has(item.id),
        isShowAnimation: animatedItemIds.has(item.id),
      };
    });
  }, [localData, currentItem, completedItemIds, animatedItemIds]);

  if (!theme) {
    return null;
  }

  const enabledElementTypes = [
    ContentEditorElementType.IMAGE,
    ContentEditorElementType.EMBED,
    ContentEditorElementType.TEXT,
  ];

  return (
    <>
      <ChecklistRoot
        data={{ ...localData, items }}
        themeSettings={theme.settings}
        expanded={expanded}
        onExpandedChange={async (expanded) => {
          setExpanded(expanded);
        }}
        zIndex={10000}
      >
        <ChecklistContainer>
          <ChecklistPopper zIndex={10000}>
            <ChecklistPopperContent>
              <ChecklistDropdown />
              <ChecklistPopperContentBody>
                <ContentEditor
                  zIndex={BUILDER_Z.canvas}
                  customUploadRequest={upload}
                  initialValue={localData.content}
                  onValueChange={handleContentChange}
                  projectId={projectId}
                  attributes={attributeList}
                  enabledElementTypes={enabledElementTypes}
                  getOembedInfo={getOembedInfo}
                />
                <ChecklistProgress />
                <ChecklistItems onClick={handleItemClick} disabledUpdate />
                <ChecklistDismiss />
              </ChecklistPopperContentBody>
              {shouldShowMadeWith && <PopperMadeWith />}
            </ChecklistPopperContent>
          </ChecklistPopper>
        </ChecklistContainer>
      </ChecklistRoot>
    </>
  );
};

ChecklistEmbed.displayName = 'ChecklistEmbed';
