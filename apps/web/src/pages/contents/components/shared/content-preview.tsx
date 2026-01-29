import { memo } from 'react';
import { EyeNoneIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import {
  ChecklistContainer,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistProgress,
  ChecklistRoot,
  ChecklistStaticPopper,
  ContentEditorSerialize,
  Popper,
  PopperClose,
  PopperMadeWith,
  PopperProgress,
  PopperStaticBubble,
  PopperStaticContent,
  useSettingsStyles,
  getThemeWidthByStepType,
  LauncherContainer,
  LauncherView,
  LauncherRoot,
} from '@usertour-packages/widget';
import { ScaledPreviewContainer } from '@usertour-packages/shared-components';
import {
  AvatarType,
  ChecklistData,
  ContentVersion,
  LauncherData,
  ProgressBarPosition,
  ProgressBarType,
  Step,
  StepContentType,
  Theme,
} from '@usertour/types';

import { useSubscriptionContext } from '@/contexts/subscription-context';

interface EmptyContentPreviewProps {
  className?: string;
}

const EmptyContentPreview = memo(({ className }: EmptyContentPreviewProps) => {
  return <img src="/images/empty.png" className={cn('h-[160px]', className)} alt="empty" />;
});

interface FlowPreviewProps {
  currentTheme: Theme;
  currentStep: Step;
  currentVersion?: ContentVersion;
  currentStepIndex?: number;
}

const FlowPreview = ({
  currentTheme,
  currentStep,
  currentVersion,
  currentStepIndex = 0,
}: FlowPreviewProps) => {
  // avatarUrl is used in BUBBLE step type, kept for consistency and fallback
  const { globalStyle, themeSetting, avatarUrl, avatarComponent } = useSettingsStyles(
    currentTheme.settings,
    {
      type: currentStep.type,
    },
  );
  const { shouldShowMadeWith } = useSubscriptionContext();

  // Get width with theme fallback if undefined
  const width =
    currentStep.setting.width ?? getThemeWidthByStepType(currentStep.type, themeSetting);

  // Calculate progress bar display
  const totalSteps = currentVersion?.steps?.length ?? 0;
  const progressType = themeSetting?.progress.type;
  const progressPosition = themeSetting?.progress.position;
  const progressEnabled = themeSetting?.progress.enabled;

  // Optimized progress display logic
  const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
  const showTopProgress =
    progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
  const showBottomProgress =
    progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

  // Handle hidden step
  if (currentStep.type === StepContentType.HIDDEN) {
    return (
      <div className="w-40 h-32 flex flex-none items-center justify-center">
        <EyeNoneIcon className="w-8 h-8" />
      </div>
    );
  }

  // Handle bubble step
  if (currentStep.type === StepContentType.BUBBLE) {
    const bubbleSettings = themeSetting?.bubble;
    const avatarSettings = themeSetting?.avatar;
    const showAvatar = avatarSettings?.type !== AvatarType.NONE;

    return (
      <Popper open={true} zIndex={1} globalStyle={globalStyle}>
        <PopperStaticBubble
          position={bubbleSettings?.placement?.position ?? 'leftBottom'}
          width={`${width}px`}
          avatarSize={avatarSettings?.size}
          avatarSrc={avatarUrl}
          avatarComponent={avatarComponent}
          notchSize={themeSetting?.tooltip?.notchSize}
          notchColor={themeSetting?.mainColor?.background}
          showAvatar={showAvatar}
        >
          {currentStep.setting.skippable && <PopperClose />}
          {showTopProgress && (
            <PopperProgress
              type={progressType}
              position={progressPosition}
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
            />
          )}
          <ContentEditorSerialize contents={currentStep.data} />
          {showBottomProgress && (
            <PopperProgress
              type={progressType}
              position={progressPosition}
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
            />
          )}
          {shouldShowMadeWith && <PopperMadeWith />}
        </PopperStaticBubble>
      </Popper>
    );
  }

  // Handle tooltip/modal step (default)
  return (
    <Popper open={true} zIndex={1} globalStyle={globalStyle}>
      <PopperStaticContent
        arrowSize={{
          width: themeSetting?.tooltip.notchSize ?? 20,
          height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
        }}
        side="bottom"
        showArrow={currentStep.type === StepContentType.TOOLTIP}
        width={`${width}px`}
        height={'auto'}
        arrowColor={themeSetting?.mainColor?.background}
      >
        {currentStep.setting.skippable && <PopperClose />}
        {showTopProgress && (
          <PopperProgress
            type={progressType}
            position={progressPosition}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
          />
        )}
        <ContentEditorSerialize contents={currentStep.data} />
        {showBottomProgress && (
          <PopperProgress
            type={progressType}
            position={progressPosition}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
          />
        )}
        {shouldShowMadeWith && <PopperMadeWith />}
      </PopperStaticContent>
    </Popper>
  );
};

const LauncherPreview = ({
  currentTheme,
  currentVersion,
}: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const data = currentVersion.data as LauncherData;
  const themeSettings = currentTheme.settings;

  return (
    <LauncherRoot themeSettings={themeSettings} data={data}>
      <LauncherContainer>
        <LauncherView
          type={data.type}
          iconType={data.iconType}
          iconSource={data.iconSource}
          iconUrl={data.iconUrl}
          buttonText={data.buttonText}
          style={{
            zIndex: 1,
          }}
        />
      </LauncherContainer>
    </LauncherRoot>
  );
};

const ChecklistPreview = (props: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const { currentTheme, currentVersion } = props;
  const data = currentVersion.data as ChecklistData;
  const themeSettings = currentTheme.settings;
  const { shouldShowMadeWith } = useSubscriptionContext();

  return (
    <ChecklistRoot data={data} themeSettings={themeSettings} zIndex={10000}>
      <ChecklistContainer>
        <ChecklistStaticPopper>
          <ContentEditorSerialize contents={data.content} />
          <ChecklistDropdown />
          <ChecklistProgress width={45} />
          <ChecklistItems disabledUpdate />
          <ChecklistDismiss />
          {shouldShowMadeWith && <PopperMadeWith />}
        </ChecklistStaticPopper>
      </ChecklistContainer>
    </ChecklistRoot>
  );
};

export {
  FlowPreview,
  LauncherPreview,
  ChecklistPreview,
  EmptyContentPreview,
  ScaledPreviewContainer,
};
