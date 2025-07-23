import * as SharedPopper from '@usertour-packages/sdk';
import { ContentEditorRoot, ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { ProgressBarPosition, ProgressBarType, ThemeTypesSetting } from '@usertour-packages/types';

interface ThemePreviewModalProps {
  contents: ContentEditorRoot[];
  settings?: ThemeTypesSetting;
  customStyle?: string;
}

export const ThemePreviewModal = (props: ThemePreviewModalProps) => {
  const { contents, settings, customStyle } = props;

  const progressType = settings?.progress.type;
  const progressPosition = settings?.progress.position;
  const progressEnabled = settings?.progress.enabled;
  // Optimized progress display logic
  const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
  const showTopProgress =
    progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
  const showBottomProgress =
    progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

  return (
    <div className="h-full w-full scale-100">
      <SharedPopper.Popper open={true} zIndex={1111} globalStyle={customStyle}>
        <SharedPopper.PopperModalContentPotal
          position={'center'}
          enabledBackdrop={true}
          width={`${settings?.modal.width}px`}
        >
          <SharedPopper.PopperContent>
            <SharedPopper.PopperClose />
            {showTopProgress && (
              <SharedPopper.PopperProgress
                type={progressType}
                currentStepIndex={2}
                position={progressPosition}
                totalSteps={4}
              />
            )}
            <ContentEditorSerialize contents={contents} />
            <SharedPopper.PopperMadeWith />
            {showBottomProgress && (
              <SharedPopper.PopperProgress
                type={progressType}
                currentStepIndex={2}
                totalSteps={4}
                position={progressPosition}
              />
            )}
          </SharedPopper.PopperContent>
        </SharedPopper.PopperModalContentPotal>
      </SharedPopper.Popper>
    </div>
  );
};

ThemePreviewModal.displayName = 'ThemePreviewModal';
