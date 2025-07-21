import {
  Popper,
  PopperContentFrame,
  PopperClose,
  PopperProgress,
  PopperMadeWith,
  PopperModalContentPotal,
  PopperOverlay,
  PopperContentPotal,
} from '@usertour-ui/sdk';
import { ContentEditorClickableElement, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import {
  Align,
  BizUserInfo,
  ProgressBarPosition,
  ProgressBarType,
  RulesCondition,
  SDKConfig,
  Side,
  Step,
  StepContentType,
  ThemeTypesSetting,
} from '@usertour-ui/types';
import { useEffect, useSyncExternalStore, useMemo } from 'react';
import { Tour as TourCore } from '../core/tour';
import { off, on } from '../utils/listener';
import { useSettingsStyles } from '@usertour-ui/sdk';

// Base props that are shared between TourPopper and TourModal
type TourBaseProps = {
  openState: boolean;
  zIndex: number;
  globalStyle: string;
  currentStep: Step;
  assets: any;
  userInfo: BizUserInfo;
  currentStepIndex: number;
  totalSteps: number;
  sdkConfig: SDKConfig;
  themeSettings: ThemeTypesSetting;
  handleClose: () => void;
  handleOnClick: (element: ContentEditorClickableElement, value?: any) => Promise<void>;
};

type TourPopperProps = TourBaseProps & {
  triggerRef: Element | null;
  handleActions: (actions: RulesCondition[]) => Promise<void>;
};

type TourModalProps = TourBaseProps;

type PopperContentProps = {
  currentStep: Step;
  userInfo: BizUserInfo;
  currentStepIndex: number;
  totalSteps: number;
  themeSettings: ThemeTypesSetting;
  sdkConfig: SDKConfig;
  handleClose: () => void;
  handleOnClick: (element: ContentEditorClickableElement, value?: any) => Promise<void>;
};

// Custom hook to extract store state
const useTourStore = (tour: TourCore) => {
  const store = useSyncExternalStore(tour.getStore().subscribe, tour.getStore().getSnapshot);

  if (!store) {
    return null;
  }

  const {
    userInfo,
    currentStep,
    triggerRef,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    sdkConfig,
    currentStepIndex,
    totalSteps,
  } = store;

  if (!userInfo || !currentStep || !openState) {
    return null;
  }

  return {
    userInfo,
    currentStep,
    triggerRef,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    sdkConfig,
    currentStepIndex: currentStepIndex || 0,
    totalSteps: totalSteps || 0,
  };
};

// Components
const PopperContent = (props: PopperContentProps) => {
  const {
    currentStep,
    userInfo,
    currentStepIndex,
    totalSteps,
    themeSettings,
    sdkConfig,
    handleClose,
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
        <PopperClose onClick={handleClose} className="cursor-pointer" />
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
        userInfo={userInfo}
      />
      {!sdkConfig.removeBranding && <PopperMadeWith />}
      {showBottomProgress && (
        <PopperProgress
          type={progressType}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          position={progressPosition}
        />
      )}
    </PopperContentFrame>
  );
};

// Hooks
const useTargetActions = (
  ref: React.RefObject<HTMLElement> | Element | null | undefined,
  currentStep: Step,
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
    userInfo,
    currentStepIndex,
    totalSteps,
    sdkConfig,
    handleClose,
    handleOnClick,
    handleActions,
  } = props;
  const { themeSetting } = useSettingsStyles(themeSettings);

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
        width={`${currentStep.setting.width}px`}
        arrowSize={{
          width: themeSetting?.tooltip.notchSize ?? 20,
          height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
        }}
        arrowColor={themeSetting?.mainColor.background}
      >
        <PopperContent
          currentStep={currentStep}
          userInfo={userInfo}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          themeSettings={themeSettings}
          sdkConfig={sdkConfig}
          handleClose={handleClose}
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
    userInfo,
    currentStepIndex,
    totalSteps,
    themeSettings,
    sdkConfig,
    handleClose,
    handleOnClick,
  } = props;

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
        width={`${currentStep.setting.width}px`}
      >
        <PopperContent
          currentStep={currentStep}
          userInfo={userInfo}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          themeSettings={themeSettings}
          sdkConfig={sdkConfig}
          handleClose={handleClose}
          handleOnClick={handleOnClick}
        />
      </PopperModalContentPotal>
    </Popper>
  );
};

export const TourWidget = (props: { tour: TourCore }) => {
  const { tour } = props;
  const storeData = useTourStore(tour);

  if (!storeData) {
    return <></>;
  }

  const { handleClose, handleOnClick, handleActions } = tour;

  const commonProps: TourBaseProps = {
    ...storeData,
    handleClose,
    handleOnClick,
  };
  const stepType = storeData.currentStep.type;
  const triggerRef = storeData.triggerRef;

  if (stepType === StepContentType.TOOLTIP && triggerRef) {
    return <TourPopper {...commonProps} triggerRef={triggerRef} handleActions={handleActions} />;
  }

  if (stepType === StepContentType.MODAL) {
    return <TourModal {...commonProps} />;
  }

  return null;
};
