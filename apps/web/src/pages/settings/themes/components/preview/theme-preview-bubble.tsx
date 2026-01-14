import {
  Popper,
  PopperBubblePortal,
  PopperClose,
  PopperContent,
  PopperMadeWith,
  PopperProgress,
} from '@usertour-packages/sdk';
import { ContentEditorRoot, ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { getAvatarDataUri } from '@usertour-packages/icons';
import {
  AvatarType,
  ProgressBarPosition,
  ProgressBarType,
  ThemeTypesSetting,
} from '@usertour/types';
import { useMemo } from 'react';

import { useSubscriptionContext } from '@/contexts/subscription-context';

interface ThemePreviewBubbleProps {
  contents: ContentEditorRoot[];
  settings?: ThemeTypesSetting;
  customStyle?: string;
}

/**
 * Get avatar URL based on avatar type
 * Uses local bundled SVG data for cartoon avatars
 */
const getAvatarUrl = (settings?: ThemeTypesSetting): string => {
  const avatar = settings?.avatar;
  if (!avatar) {
    return '';
  }

  switch (avatar.type) {
    case AvatarType.CARTOON: {
      const avatarName = avatar.name ?? 'alex';
      return getAvatarDataUri(avatarName) ?? '';
    }
    case AvatarType.URL:
    case AvatarType.UPLOAD:
      return avatar.url ?? '';
    default:
      return '';
  }
};

export const ThemePreviewBubble = (props: ThemePreviewBubbleProps) => {
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

  // Get bubble settings
  const bubbleSettings = settings?.bubble;
  const avatarSettings = settings?.avatar;

  // Memoize avatar URL
  const avatarUrl = useMemo(() => getAvatarUrl(settings), [settings]);

  return (
    <div className="h-full w-full scale-100">
      <Popper open={true} zIndex={1111} globalStyle={customStyle}>
        <PopperBubblePortal
          position={bubbleSettings?.placement?.position ?? 'leftBottom'}
          positionOffsetX={bubbleSettings?.placement?.positionOffsetX ?? 20}
          positionOffsetY={bubbleSettings?.placement?.positionOffsetY ?? 20}
          width={`${bubbleSettings?.width ?? 300}px`}
          avatarSize={avatarSettings?.size ?? 60}
          avatarSrc={avatarUrl}
          notchSize={settings?.tooltip?.notchSize ?? 20}
          notchColor={settings?.mainColor.background}
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
