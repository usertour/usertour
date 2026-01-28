import {
  ContentEditorSerialize,
  Popper,
  PopperBubblePortal,
  PopperClose,
  PopperContentFrame,
  PopperContentPotal,
  PopperMadeWith,
  PopperModalContentPotal,
  PopperOverlay,
  PopperProgress,
  useSettingsStyles,
  useStepWidth,
} from '@usertour-packages/widget';
import {
  Align,
  AvatarType,
  ContentEditorClickableElement,
  contentEndReason,
  ModalBackdropClickBehavior,
  ProgressBarPosition,
  ProgressBarType,
  RulesCondition,
  SessionStep,
  Side,
  StepContentType,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { UsertourTour } from '@/core/usertour-tour';
import { off, on } from '@/utils';

// Base props that are shared between TourPopper and TourModal
type TourBaseProps = {
  openState: boolean;
  zIndex: number;
  globalStyle: string;
  currentStep: SessionStep;
  assets: any;
  userAttributes?: UserTourTypes.Attributes;
  currentStepIndex: number;
  totalSteps: number;
  removeBranding: boolean;
  themeSettings: ThemeTypesSetting;
  handleDismiss: (reason?: contentEndReason) => void;
  handleOnClick: (element: ContentEditorClickableElement, value?: any) => Promise<void>;
};

type TourPopperProps = TourBaseProps & {
  triggerRef: Element | null;
  handleActions: (actions: RulesCondition[]) => Promise<void>;
};

type TourModalProps = TourBaseProps;

type PopperContentProps = {
  currentStep: SessionStep;
  userAttributes?: UserTourTypes.Attributes;
  currentStepIndex: number;
  totalSteps: number;
  themeSettings: ThemeTypesSetting;
  removeBranding: boolean;
  handleDismiss: (reason?: contentEndReason) => void;
  handleOnClick: (element: ContentEditorClickableElement, value?: any) => Promise<void>;
};

// Custom hook to extract store state
const useTourStore = (tour: UsertourTour) => {
  const store = useSyncExternalStore(tour.subscribe, tour.getSnapshot);

  if (!store) {
    return null;
  }

  const {
    userAttributes,
    currentStep,
    triggerRef,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    removeBranding,
    currentStepIndex,
    totalSteps,
  } = store;

  if (!currentStep || !openState) {
    return null;
  }

  return {
    userAttributes,
    currentStep,
    triggerRef,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    removeBranding,
    currentStepIndex: currentStepIndex || 0,
    totalSteps: totalSteps || 0,
  };
};

// Components
const PopperContent = (props: PopperContentProps) => {
  const {
    currentStep,
    userAttributes,
    currentStepIndex,
    totalSteps,
    themeSettings,
    removeBranding,
    handleDismiss,
    handleOnClick,
  } = props;
  const { themeSetting } = useSettingsStyles(themeSettings);

  const progressType = themeSetting.progress.type;
  const progressPosition = themeSetting.progress.position;
  const progressEnabled = themeSetting.progress.enabled;

  // Optimized progress display logic
  const isFullWidthProgress = progressType === ProgressBarType.FULL_WIDTH;
  const showTopProgress =
    progressEnabled && (isFullWidthProgress || progressPosition === ProgressBarPosition.TOP);
  const showBottomProgress =
    progressEnabled && !isFullWidthProgress && progressPosition === ProgressBarPosition.BOTTOM;

  return (
    <PopperContentFrame>
      {currentStep.setting.skippable && (
        <PopperClose onClick={handleDismiss} className="cursor-pointer" />
      )}
      {showTopProgress && (
        <PopperProgress
          type={progressType}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          position={progressPosition}
        />
      )}
      <ContentEditorSerialize
        contents={currentStep.data}
        onClick={handleOnClick}
        userAttributes={userAttributes}
      />
      {showBottomProgress && (
        <PopperProgress
          type={progressType}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          position={progressPosition}
        />
      )}
      {!removeBranding && <PopperMadeWith />}
    </PopperContentFrame>
  );
};

// Hooks
const useTargetActions = (
  ref: React.RefObject<HTMLElement> | Element | null | undefined,
  currentStep: SessionStep,
  handleActions: (actions: RulesCondition[]) => Promise<void>,
) => {
  useEffect(() => {
    const element = ref instanceof Element ? ref : ref?.current;
    if (!element || !currentStep?.target?.actions) return;

    const actions = currentStep.target.actions as RulesCondition[];
    const handler = () => handleActions(actions);

    on(element, 'click', handler);
    return () => off(element, 'click', handler);
  }, [ref, currentStep?.target?.actions, handleActions]);
};

// Components
const TourPopper = (props: TourPopperProps) => {
  const {
    openState,
    zIndex,
    globalStyle,
    currentStep,
    themeSettings,
    triggerRef,
    assets,
    userAttributes,
    currentStepIndex,
    totalSteps,
    removeBranding,
    handleDismiss,
    handleOnClick,
    handleActions,
  } = props;
  const { themeSetting } = useSettingsStyles(themeSettings);

  // Get width using the unified hook (handles undefined width with theme fallback)
  const { width } = useStepWidth({ step: currentStep, themeSetting });

  // Create a responsive React.RefObject that updates when triggerRef changes
  const responsiveRef = useMemo(() => {
    const ref = { current: null as HTMLElement | null };
    if (triggerRef instanceof Element) {
      ref.current = triggerRef as HTMLElement;
    }
    return ref;
  }, [triggerRef]);

  useTargetActions(responsiveRef, currentStep, handleActions);

  const side =
    currentStep.setting.alignType === 'auto'
      ? 'bottom'
      : ((currentStep.setting.side as Side) ?? 'bottom');

  const align =
    currentStep.setting.alignType === 'auto'
      ? 'center'
      : ((currentStep.setting.align as Align) ?? 'center');

  return (
    <Popper
      triggerRef={responsiveRef}
      open={openState}
      zIndex={zIndex}
      globalStyle={globalStyle}
      assets={assets}
      isIframeMode={true}
    >
      {currentStep.setting.enabledBackdrop && (
        <PopperOverlay blockTarget={currentStep.setting.enabledBlockTarget} />
      )}
      <PopperContentPotal
        hideWhenDetached={true}
        sideOffset={currentStep.setting.sideOffset}
        alignOffset={currentStep.setting.alignOffset}
        avoidCollisions={currentStep.setting.alignType === 'auto'}
        side={side}
        align={align}
        width={`${width}px`}
        arrowSize={{
          width: themeSetting?.tooltip.notchSize ?? 20,
          height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
        }}
        arrowColor={themeSetting?.mainColor.background}
      >
        <PopperContent
          currentStep={currentStep}
          userAttributes={userAttributes}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          themeSettings={themeSettings}
          removeBranding={removeBranding}
          handleDismiss={handleDismiss}
          handleOnClick={handleOnClick}
        />
      </PopperContentPotal>
    </Popper>
  );
};

const TourModal = (props: TourModalProps) => {
  const {
    openState,
    zIndex,
    globalStyle,
    currentStep,
    assets,
    userAttributes,
    currentStepIndex,
    totalSteps,
    themeSettings,
    removeBranding,
    handleDismiss,
    handleOnClick,
  } = props;
  const { themeSetting } = useSettingsStyles(themeSettings);

  // Get width using the unified hook (handles undefined width with theme fallback)
  const { width } = useStepWidth({ step: currentStep, themeSetting });

  const handleBackdropClick = useCallback(() => {
    const behavior = themeSettings?.modal?.backdropClickBehavior;
    if (behavior === ModalBackdropClickBehavior.DISMISS_FLOW) {
      handleDismiss(contentEndReason.BACKDROP_DISMISS);
    }
  }, [themeSettings, handleDismiss]);

  return (
    <Popper
      isIframeMode={true}
      open={openState}
      zIndex={zIndex}
      globalStyle={globalStyle}
      assets={assets}
    >
      <PopperModalContentPotal
        position={currentStep.setting.position ?? ''}
        enabledBackdrop={currentStep.setting.enabledBackdrop}
        positionOffsetX={currentStep.setting.positionOffsetX}
        positionOffsetY={currentStep.setting.positionOffsetY}
        width={`${width}px`}
        onBackdropClick={handleBackdropClick}
      >
        <PopperContent
          currentStep={currentStep}
          userAttributes={userAttributes}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          themeSettings={themeSettings}
          removeBranding={removeBranding}
          handleDismiss={handleDismiss}
          handleOnClick={handleOnClick}
        />
      </PopperModalContentPotal>
    </Popper>
  );
};

const TourBubble = (props: TourModalProps) => {
  const {
    openState,
    zIndex,
    globalStyle,
    currentStep,
    assets,
    userAttributes,
    currentStepIndex,
    totalSteps,
    themeSettings,
    removeBranding,
    handleDismiss,
    handleOnClick,
  } = props;
  const { themeSetting, avatarUrl, avatarComponent } = useSettingsStyles(themeSettings);

  // Get width using the unified hook (handles undefined width with theme fallback)
  const { width } = useStepWidth({ step: currentStep, themeSetting });

  // Get bubble settings from theme
  const bubblePlacement = themeSetting?.bubble?.placement;
  const avatarSettings = themeSetting?.avatar;

  // Determine whether to show avatar based on avatar type
  const showAvatar = avatarSettings?.type !== AvatarType.NONE;

  return (
    <Popper
      isIframeMode={true}
      open={openState}
      zIndex={zIndex}
      globalStyle={globalStyle}
      assets={assets}
    >
      <PopperBubblePortal
        position={bubblePlacement?.position ?? 'leftBottom'}
        positionOffsetX={bubblePlacement?.positionOffsetX ?? 20}
        positionOffsetY={bubblePlacement?.positionOffsetY ?? 20}
        width={`${width}px`}
        avatarSize={avatarSettings?.size ?? 60}
        avatarSrc={avatarUrl}
        avatarComponent={avatarComponent}
        notchColor={themeSetting?.mainColor?.background}
        showAvatar={showAvatar}
      >
        <PopperContent
          currentStep={currentStep}
          userAttributes={userAttributes}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          themeSettings={themeSettings}
          removeBranding={removeBranding}
          handleDismiss={handleDismiss}
          handleOnClick={handleOnClick}
        />
      </PopperBubblePortal>
    </Popper>
  );
};

export const TourWidget = (props: { tour: UsertourTour }) => {
  const { tour } = props;
  const storeData = useTourStore(tour);

  if (!storeData) {
    return <></>;
  }

  // Use arrow functions to ensure 'this' context is preserved
  // Direct method references may lose binding in some cases
  const handleActions = (actions: RulesCondition[]) => tour.handleActions(actions);

  const commonProps: TourBaseProps = {
    ...storeData,
    handleDismiss: tour.handleDismiss,
    handleOnClick: tour.handleOnClick,
  };
  const stepType = storeData.currentStep.type;
  const triggerRef = storeData.triggerRef;

  if (stepType === StepContentType.TOOLTIP && triggerRef) {
    return <TourPopper {...commonProps} triggerRef={triggerRef} handleActions={handleActions} />;
  }

  if (stepType === StepContentType.MODAL) {
    return <TourModal {...commonProps} />;
  }

  if (stepType === StepContentType.BUBBLE) {
    return <TourBubble {...commonProps} />;
  }

  return null;
};
