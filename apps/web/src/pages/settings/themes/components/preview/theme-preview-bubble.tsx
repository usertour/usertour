import {
  ContentEditorSerialize,
  Popper,
  PopperBubblePortal,
  PopperClose,
  PopperContent,
  PopperMadeWith,
  PopperProgress,
  useSettingsStyles,
} from '@usertour-packages/widget';
import type { ContentEditorRoot } from '@usertour/types';
import {
  AvatarType,
  ProgressBarPosition,
  ProgressBarType,
  ThemeTypesSetting,
} from '@usertour/types';

import { useSubscriptionContext } from '@/contexts/subscription-context';

interface ThemePreviewBubbleProps {
  contents: ContentEditorRoot[];
  settings?: ThemeTypesSetting;
  customStyle?: string;
}

export const ThemePreviewBubble = (props: ThemePreviewBubbleProps) => {
  const { contents, settings } = props;
  const { shouldShowMadeWith } = useSubscriptionContext();

  // Use unified settings hook for CSS vars and avatar URL
  const { globalStyle, themeSetting, avatarUrl, avatarComponent } = useSettingsStyles(
    settings as ThemeTypesSetting,
  );

  const progressType = themeSetting?.progress.type;
  const progressPosition = themeSetting?.progress.position;
  const progressEnabled = themeSetting?.progress.enabled;

  // Optimized progress display logic
  const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
  const showTopProgress =
    progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
  const showBottomProgress =
    progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

  // Get bubble settings
  const bubbleSettings = themeSetting?.bubble;
  const avatarSettings = themeSetting?.avatar;

  // Determine whether to show avatar based on avatar type
  const showAvatar = avatarSettings?.type !== AvatarType.NONE;

  return (
    <div className="h-full w-full scale-100">
      <Popper open={true} zIndex={1111} globalStyle={globalStyle}>
        <PopperBubblePortal
          position={bubbleSettings?.placement?.position ?? 'leftBottom'}
          positionOffsetX={bubbleSettings?.placement?.positionOffsetX ?? 20}
          positionOffsetY={bubbleSettings?.placement?.positionOffsetY ?? 20}
          width={`${bubbleSettings?.width ?? 300}px`}
          avatarSize={avatarSettings?.size ?? 60}
          avatarSrc={avatarUrl}
          avatarComponent={avatarComponent}
          notchSize={themeSetting?.tooltip?.notchSize ?? 20}
          notchColor={themeSetting?.mainColor.background}
          showAvatar={showAvatar}
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
        </PopperBubblePortal>
      </Popper>
    </div>
  );
};

ThemePreviewBubble.displayName = 'ThemePreviewBubble';
