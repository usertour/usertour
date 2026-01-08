import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { PopperMadeWith } from '@usertour-packages/sdk';
import {
  LauncherContainer,
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour-packages/sdk/src/launcher';
import { ContentEditor, ContentEditorRoot } from '@usertour-packages/shared-editor';
import { createValue1 } from '../../../utils/default-data';
import {
  ContentActionsItemType,
  LauncherActionType,
  LauncherData,
  LauncherPositionType,
  Theme,
} from '@usertour/types';
import { forwardRef, useMemo, useRef } from 'react';
import { useBuilderContext } from '../../../contexts';
import { useAttributeListContext } from '@usertour-packages/contexts';
export interface LauncherContentProps {
  zIndex: number;
  triggerRef?: React.RefObject<any> | undefined;
  theme: Theme;
  data: LauncherData;
  onValueChange: (value: ContentEditorRoot[]) => void;
  onCustomUploadRequest: (file: File) => Promise<string>;
}

export const LauncherContentMain = forwardRef<HTMLDivElement, LauncherContentProps>(
  (props: LauncherContentProps, ref) => {
    const { zIndex, triggerRef, theme, data, onValueChange, onCustomUploadRequest } = props;
    const launcherRef = useRef<HTMLDivElement>(null);
    const { projectId, shouldShowMadeWith = true } = useBuilderContext();

    const { attributeList } = useAttributeListContext();
    const triggerReference = useMemo(
      () => (data.tooltip.reference === LauncherPositionType.TARGET ? triggerRef : launcherRef),
      [data.tooltip.reference, triggerRef],
    );

    const isTooltipOpen = data.behavior.actionType === LauncherActionType.SHOW_TOOLTIP;

    return (
      <LauncherRoot themeSettings={theme.settings} data={data}>
        <LauncherContainer>
          <LauncherPopper triggerRef={triggerReference} open={isTooltipOpen} zIndex={zIndex}>
            <LauncherPopperContentPotal ref={ref}>
              <LauncherPopperContent>
                <ContentEditor
                  attributes={attributeList || []}
                  zIndex={zIndex + EXTENSION_CONTENT_POPPER}
                  customUploadRequest={onCustomUploadRequest}
                  actionItems={[
                    ContentActionsItemType.LAUNCHER_DISMIS,
                    ContentActionsItemType.JAVASCRIPT_EVALUATE,
                    ContentActionsItemType.PAGE_NAVIGATE,
                    ContentActionsItemType.FLOW_START,
                  ]}
                  projectId={projectId}
                  initialValue={
                    data.tooltip.content.length > 0
                      ? (data.tooltip.content as ContentEditorRoot[])
                      : (createValue1 as ContentEditorRoot[])
                  }
                  onValueChange={onValueChange}
                />
                {shouldShowMadeWith && <PopperMadeWith />}
              </LauncherPopperContent>
            </LauncherPopperContentPotal>
          </LauncherPopper>
          <LauncherContentWrapper zIndex={zIndex} referenceRef={triggerRef} ref={launcherRef} />
        </LauncherContainer>
      </LauncherRoot>
    );
  },
);
LauncherContentMain.displayName = 'LauncherContentMain';
