import { EXTENSION_CONTENT_POPPER } from '@usertour/constants';
import {
  PopperMadeWith,
  LauncherContainer,
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour/widget';
import { ContentEditor, ContentEditorRoot } from '@usertour/editor';
import { getEmptyDataForType } from '../../../utils/default-data';
import {
  ContentActionsItemType,
  LauncherActionType,
  LauncherData,
  LauncherPositionType,
  Theme,
} from '@usertour/types';
import { forwardRef, useMemo, useRef } from 'react';
import { useBuilderConfig, useProjectId } from '../../../contexts';
import { useAttributeList } from '../../../hooks/use-attribute-list';
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
    const { shouldShowMadeWith = true } = useBuilderConfig();
    const projectId = useProjectId();

    const { attributeList } = useAttributeList();
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
                      : getEmptyDataForType()
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
