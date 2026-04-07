import { memo } from 'react';
import { useEventListContext } from '@/contexts/event-list-context';
import { EyeNoneIcon, RiFlashlightFill } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import {
  BannerContainer,
  BannerPreview,
  BannerRoot,
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
  ResourceCenterRoot,
  ResourceCenterStyleProvider,
  ResourceCenterPanel,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterTabBar,
  ResourceCenterFooter,
} from '@usertour-packages/widget';
import { ScaledPreviewContainer } from '@usertour-packages/shared-components';
import {
  AvatarType,
  BannerData,
  ChecklistData,
  ContentVersion,
  DEFAULT_BANNER_DATA,
  LauncherData,
  ProgressBarPosition,
  ProgressBarType,
  ResourceCenterData,
  Step,
  StepContentType,
  Theme,
} from '@usertour/types';

import { PREVIEW_BASIC } from '@usertour-packages/constants';
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
      <Popper open={true} zIndex={PREVIEW_BASIC} globalStyle={globalStyle}>
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
    <Popper open={true} zIndex={PREVIEW_BASIC} globalStyle={globalStyle}>
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

const ResourceCenterPreview = (props: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const { currentTheme, currentVersion } = props;
  const data = currentVersion.data as ResourceCenterData;
  const themeSettings = currentTheme.settings;
  const { shouldShowMadeWith } = useSubscriptionContext();

  const normalWidth = themeSettings.resourceCenter?.normalWidth ?? 410;
  const previewHeight = Math.round(normalWidth * 1.4);

  return (
    <ResourceCenterRoot
      data={data}
      themeSettings={themeSettings}
      expanded={true}
      onExpandedChange={async () => {}}
      zIndex={10000}
      showMadeWith={shouldShowMadeWith}
    >
      <ResourceCenterStyleProvider>
        <ResourceCenterPanel mode="dom" position={false} openHeightOverride={previewHeight}>
          <ResourceCenterHeader />
          <ResourceCenterBody>
            <ResourceCenterBlocks />
          </ResourceCenterBody>
          <ResourceCenterTabBar />
          <ResourceCenterFooter />
        </ResourceCenterPanel>
      </ResourceCenterStyleProvider>
    </ResourceCenterRoot>
  );
};

const BannerPreviewContent = ({
  currentTheme,
  currentVersion,
  previewWidth,
  previewClassName,
}: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
  previewWidth?: number;
  previewClassName?: string;
}) => {
  const data = (currentVersion.data as BannerData | undefined) ?? DEFAULT_BANNER_DATA;
  const themeSettings = currentTheme.settings;
  const width = previewWidth ?? data.maxEmbedWidth ?? 960;

  return (
    <BannerRoot themeSettings={themeSettings} data={data}>
      <BannerContainer>
        <BannerPreview previewMode className={previewClassName} style={{ width, maxWidth: '100%' }}>
          <ContentEditorSerialize contents={data.contents ?? []} />
        </BannerPreview>
      </BannerContainer>
    </BannerRoot>
  );
};

const TrackerPreview = ({ currentVersion }: { currentVersion: ContentVersion }) => {
  const { eventList } = useEventListContext();

  const versionData =
    typeof currentVersion.data === 'string' ? JSON.parse(currentVersion.data) : currentVersion.data;

  const hasEvent = !!versionData?.eventId;
  const eventId = versionData?.eventId as string | undefined;
  const eventDisplayName = eventList?.find((item) => item.id === eventId)?.displayName;
  const conditionCount = ((currentVersion.config as { autoStartRules?: unknown[] } | undefined)
    ?.autoStartRules?.length ?? 0) as number;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-3 px-6">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
        <RiFlashlightFill className="w-5 h-5 text-primary" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center w-full max-w-[260px]">
        <span className="text-sm font-medium text-foreground truncate max-w-full">
          {hasEvent ? eventDisplayName || 'Event configured' : 'No event selected'}
        </span>
        <span className="text-xs text-muted-foreground">
          {conditionCount > 0
            ? `${conditionCount} trigger condition${conditionCount > 1 ? 's' : ''}`
            : 'No trigger conditions'}
        </span>
      </div>
    </div>
  );
};

export {
  FlowPreview,
  LauncherPreview,
  ChecklistPreview,
  ResourceCenterPreview,
  BannerPreviewContent,
  TrackerPreview,
  EmptyContentPreview,
  ScaledPreviewContainer,
};
