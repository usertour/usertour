import { EXTENSION_CONTENT_POPPER } from '@usertour-ui/constants';
import { PopperMadeWith } from '@usertour-ui/sdk';
import {
  LauncherContainer,
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour-ui/sdk/src/launcher';
import { ContentEditor, ContentEditorRoot, createValue1 } from '@usertour-ui/shared-editor';
import {
  ContentActionsItemType,
  LauncherActionType,
  LauncherData,
  LauncherPositionType,
  Theme,
} from '@usertour-ui/types';
import { forwardRef, useMemo, useRef } from 'react';
import { useBuilderContext } from '../../../contexts';
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
    const { projectId } = useBuilderContext();

    const triggerReference = useMemo(
      () => (data.tooltip.reference === LauncherPositionType.TARGET ? triggerRef : launcherRef),
      [data.tooltip.reference, triggerRef],
    );

    const isTooltipOpen = data.behavior.actionType === LauncherActionType.SHOW_TOOLTIP;

    return (
      <LauncherRoot theme={theme} data={data}>
        <LauncherContainer>
          <LauncherPopper triggerRef={triggerReference} open={isTooltipOpen} zIndex={zIndex}>
            <LauncherPopperContentPotal ref={ref}>
              <LauncherPopperContent>
                <ContentEditor
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
                <PopperMadeWith />
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
