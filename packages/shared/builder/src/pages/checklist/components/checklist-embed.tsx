import { EXTENSION_CONTENT_POPPER } from '@usertour-ui/constants';
import { useThemeListContext } from '@usertour-ui/contexts';
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
} from '@usertour-ui/sdk';
import { ContentEditor, ContentEditorRoot } from '@usertour-ui/shared-editor';
import { ChecklistInitialDisplay, Theme } from '@usertour-ui/types';
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
    return item.id === currentItem?.id ? currentItem : item;
  });

  return (
    <>
      <ChecklistRoot
        data={{ ...localData, items }}
        theme={theme}
        defaultOpen={localData.initialDisplay === ChecklistInitialDisplay.EXPANDED}
      >
        <ChecklistContainer>
          <ChecklistPopper zIndex={1111}>
            <ChecklistPopperContent>
              <ChecklistDropdown />
              <ChecklistPopperContentBody>
                <ContentEditor
                  zIndex={EXTENSION_CONTENT_POPPER}
                  customUploadRequest={handleCustomUploadRequest}
                  initialValue={localData.content}
                  onValueChange={handleContentChange}
                  projectId={projectId}
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
