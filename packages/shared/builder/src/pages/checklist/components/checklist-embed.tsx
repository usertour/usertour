import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useAttributeListContext, useThemeListContext } from '@usertour-packages/contexts';
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
} from '@usertour-packages/sdk';
import { ContentEditor, ContentEditorRoot } from '@usertour-packages/shared-editor';
import { ChecklistInitialDisplay, ContentEditorElementType, Theme } from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useBuilderContext, useChecklistContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';

export const ChecklistEmbed = () => {
  const { localData, currentItem, updateLocalData } = useChecklistContext();
  const { upload } = useAws();
  const [theme, setTheme] = useState<Theme | undefined>();
  const { themeList } = useThemeListContext();
  const { currentVersion, projectId } = useBuilderContext();
  const [expanded, setExpanded] = useState(
    localData?.initialDisplay === ChecklistInitialDisplay.EXPANDED,
  );
  const { attributeList } = useAttributeListContext();

  useEffect(() => {
    setExpanded(localData?.initialDisplay === ChecklistInitialDisplay.EXPANDED);
  }, [localData?.initialDisplay]);

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

  const handleContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (localData && !isEqual(value, localData.content)) {
        updateLocalData({ content: value });
      }
    },
    [localData, updateLocalData],
  );

  const handleCustomUploadRequest = useCallback(
    (file: File): Promise<string> => upload(file),
    [upload],
  );

  if (!theme || !localData) {
    return null;
  }

  const items = localData.items.map((item) => {
    const newItem = item.id === currentItem?.id ? currentItem : item;
    return { ...newItem, isVisible: true };
  });

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
                  zIndex={EXTENSION_CONTENT_POPPER}
                  customUploadRequest={handleCustomUploadRequest}
                  initialValue={localData.content}
                  onValueChange={handleContentChange}
                  projectId={projectId}
                  attributes={attributeList}
                  enabledElementTypes={enabledElementTypes}
                />
                <ChecklistProgress />
                <ChecklistItems />
                <ChecklistDismiss />
              </ChecklistPopperContentBody>
              <PopperMadeWith />
            </ChecklistPopperContent>
          </ChecklistPopper>
        </ChecklistContainer>
      </ChecklistRoot>
    </>
  );
};

ChecklistEmbed.displayName = 'ChecklistEmbed';
