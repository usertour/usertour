import {
  Popper,
  PopperClose,
  PopperContent,
  PopperMadeWith,
  PopperModalContentPotal,
  PopperProgress,
} from '@usertour-packages/sdk';
import { ContentEditorRoot, ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { ProgressBarPosition, ProgressBarType, ThemeTypesSetting } from '@usertour/types';

import { useSubscriptionContext } from '@/contexts/subscription-context';

interface ThemePreviewModalProps {
  contents: ContentEditorRoot[];
  settings?: ThemeTypesSetting;
  customStyle?: string;
}

export const ThemePreviewModal = (props: ThemePreviewModalProps) => {
  const { contents, settings, customStyle } = props;
  const { shouldShowMadeWith } = useSubscriptionContext();

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
      <Popper open={true} zIndex={1111} globalStyle={customStyle}>
        <PopperModalContentPotal
          position={'center'}
          enabledBackdrop={true}
          width={`${settings?.modal.width}px`}
        >
          <PopperContent>
            <PopperClose />
            {showTopProgress && (
              <PopperProgress
                type={progressType}
                currentStepIndex={2}
                position={progressPosition}
                totalSteps={4}
              />
            )}
            <ContentEditorSerialize contents={contents} />
            {shouldShowMadeWith && <PopperMadeWith />}
            {showBottomProgress && (
              <PopperProgress
                type={progressType}
                currentStepIndex={2}
                totalSteps={4}
                position={progressPosition}
              />
            )}
          </PopperContent>
        </PopperModalContentPotal>
      </Popper>
    </div>
  );
};

ThemePreviewModal.displayName = 'ThemePreviewModal';
