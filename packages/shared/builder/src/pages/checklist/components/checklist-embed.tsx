import { useThemeListContext } from "@usertour-ui/contexts";
import { ChecklistInitialDisplay, Theme } from "@usertour-ui/types";
import { forwardRef, useCallback, useEffect, useState } from "react";
import {
  ChecklistRoot,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopper,
  ChecklistPopperContent,
  ChecklistProgress,
  PopperMadeWith,
  ChecklistContainer,
  ChecklistPopperContentBody,
} from "@usertour-ui/sdk";
import { ContentEditor, ContentEditorRoot } from "@usertour-ui/shared-editor";
import { useBuilderContext, useChecklistContext } from "../../../contexts";
import { EXTENSION_CONTENT_POPPER } from "@usertour-ui/constants";
import { useAws } from "../../../hooks/use-aws";
import { isEqual } from "lodash";

export interface ChecklistEmbedProps {}

export const ChecklistEmbed = forwardRef<HTMLDivElement, ChecklistEmbedProps>(
  (props: ChecklistEmbedProps, ref) => {
    const { localData, currentItem, updateLocalData } = useChecklistContext();
    const { upload } = useAws();
    const [theme, setTheme] = useState<Theme | undefined>();
    const { themeList } = useThemeListContext();
    const { currentVersion } = useBuilderContext();

    useEffect(() => {
      if (!themeList) {
        return;
      }
      if (themeList.length > 0) {
        let theme: Theme | undefined;
        if (currentVersion && currentVersion.themeId) {
          theme = themeList.find((item) => item.id == currentVersion.themeId);
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
      [localData, updateLocalData]
    );

    const handleCustomUploadRequest = useCallback(
      (file: File): Promise<string> => upload(file),
      [upload]
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
          defaultOpen={
            localData.initialDisplay === ChecklistInitialDisplay.EXPANDED
          }
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
  }
);

ChecklistEmbed.displayName = "ChecklistEmbed";
