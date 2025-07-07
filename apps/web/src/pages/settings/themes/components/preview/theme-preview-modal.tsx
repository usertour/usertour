import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorRoot, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import { ProgressBarPosition, ProgressBarType } from '@usertour-ui/types';

export const ThemePreviewModal = (props: { contents: ContentEditorRoot[] }) => {
  const { contents } = props;
  const { settings, customStyle } = useThemeDetailContext();

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
    <div className="h-full w-full" style={{ transform: 'scale(1)' }}>
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
              />
            )}
          </SharedPopper.PopperContent>
        </SharedPopper.PopperModalContentPotal>
      </SharedPopper.Popper>
    </div>
  );
};

ThemePreviewModal.displayName = 'ThemePreviewModal';
