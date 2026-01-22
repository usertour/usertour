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
}

const FlowPreview = ({ currentTheme, currentStep }: FlowPreviewProps) => {
  const { globalStyle, themeSetting, avatarUrl } = useSettingsStyles(currentTheme.settings, {
    useLocalAvatarPath: true,
  });

  // Get width with theme fallback if undefined
  const width =
    currentStep.setting.width ?? getThemeWidthByStepType(currentStep.type, themeSetting);

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
          notchSize={themeSetting?.tooltip?.notchSize}
          notchColor={themeSetting?.mainColor?.background}
          showAvatar={showAvatar}
        >
          {currentStep.setting.skippable && <PopperClose />}
          <ContentEditorSerialize contents={currentStep.data} />
        </PopperStaticBubble>
      </Popper>
    );
  }

  // Handle tooltip/modal step (default)
  return (
    <Popper open={true} zIndex={1} globalStyle={globalStyle}>
      <PopperStaticContent
        arrowSize={{ width: 20, height: 10 }}
        side="bottom"
        showArrow={false}
        width={`${width}px`}
        height={'auto'}
      >
        {currentStep.setting.skippable && <PopperClose />}
        <ContentEditorSerialize contents={currentStep.data} />
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
          <ChecklistDropdown />
          <ChecklistProgress width={45} />
          <ChecklistItems />
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
