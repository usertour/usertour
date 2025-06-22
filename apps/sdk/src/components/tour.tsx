import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorClickableElement, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import { Align, RulesCondition, Side, StepContentType } from '@usertour-ui/types';
import { useEffect, useSyncExternalStore, useMemo } from 'react';
import { Tour as TourCore } from '../core/tour';
import { TourStore } from '../types/store';
import { off, on } from '../utils/listener';

// Types
type TourProps = {
  tour: TourCore;
};

type TourSharedProps = {
  store: TourStore;
  onClose: () => void;
  handleOnClick: (element: ContentEditorClickableElement, value?: any) => void;
  handleActions: (actions: RulesCondition[]) => Promise<void>;
};

type PopperContentProps = Omit<TourSharedProps, 'handleActions'>;

// Components
const PopperContent = ({ store, onClose, handleOnClick }: PopperContentProps) => {
  const { currentStep, userInfo, progress } = store;

  if (!currentStep) return null;

  return (
    <SharedPopper.PopperContentFrame>
      {currentStep.setting.skippable && (
        <SharedPopper.PopperClose onClick={onClose} className="cursor-pointer" />
      )}
      <ContentEditorSerialize
        contents={currentStep.data}
        onClick={handleOnClick}
        userInfo={userInfo}
      />
      {!store.sdkConfig.removeBranding && <SharedPopper.PopperMadeWith />}
      <SharedPopper.PopperProgress width={progress} />
    </SharedPopper.PopperContentFrame>
  );
};

// Hooks
const useTargetActions = (
  ref: React.RefObject<HTMLElement> | Element | null | undefined,
  currentStep: TourStore['currentStep'],
  handleActions: TourSharedProps['handleActions'],
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
const TourPopper = ({ store, ...props }: TourSharedProps) => {
  const { openState, zIndex, globalStyle, currentStep, theme, triggerRef, assets } = store;
  const themeSetting = theme?.settings;

  // Create a responsive React.RefObject that updates when triggerRef changes
  const responsiveRef = useMemo(() => {
    const ref = { current: null as HTMLElement | null };
    if (triggerRef instanceof Element) {
      ref.current = triggerRef as HTMLElement;
    }
    return ref;
  }, [triggerRef]);

  useTargetActions(responsiveRef, currentStep, props.handleActions);

  if (!currentStep) return null;

  const side =
    currentStep?.setting?.alignType === 'auto'
      ? 'bottom'
      : ((currentStep?.setting?.side as Side) ?? 'bottom');

  const align =
    currentStep?.setting?.alignType === 'auto'
      ? 'center'
      : ((currentStep?.setting?.align as Align) ?? 'center');

  return (
    <SharedPopper.Popper
      triggerRef={responsiveRef}
      open={openState}
      zIndex={zIndex}
      globalStyle={globalStyle}
      assets={assets}
    >
      {currentStep?.setting?.enabledBackdrop && (
        <SharedPopper.PopperOverlay blockTarget={currentStep?.setting.enabledBlockTarget} />
      )}
      <SharedPopper.PopperContentPotal
        hideWhenDetached={true}
        sideOffset={currentStep?.setting.sideOffset}
        alignOffset={currentStep?.setting.alignOffset}
        avoidCollisions={currentStep?.setting.alignType === 'auto'}
        side={side}
        align={align}
        width={`${currentStep?.setting.width}px`}
        arrowSize={{
          width: themeSetting?.tooltip.notchSize ?? 20,
          height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
        }}
        arrowColor={themeSetting?.mainColor.background}
      >
        <PopperContent store={store} onClose={props.onClose} handleOnClick={props.handleOnClick} />
      </SharedPopper.PopperContentPotal>
    </SharedPopper.Popper>
  );
};

const TourModal = ({ store, onClose, handleOnClick }: PopperContentProps) => {
  const { openState, zIndex, globalStyle, currentStep, assets } = store;

  return (
    <SharedPopper.Popper open={openState} zIndex={zIndex} globalStyle={globalStyle} assets={assets}>
      <SharedPopper.PopperModalContentPotal
        position={currentStep?.setting.position ?? ''}
        enabledBackdrop={currentStep?.setting?.enabledBackdrop}
        positionOffsetX={currentStep?.setting?.positionOffsetX}
        positionOffsetY={currentStep?.setting?.positionOffsetY}
        width={`${currentStep?.setting.width}px`}
      >
        <PopperContent store={store} onClose={onClose} handleOnClick={handleOnClick} />
      </SharedPopper.PopperModalContentPotal>
    </SharedPopper.Popper>
  );
};

export const Tour = ({ tour }: TourProps) => {
  const store = useSyncExternalStore(tour.getStore().subscribe, tour.getStore().getSnapshot);
  const { userInfo, currentStep, triggerRef, openState } = store;
  const { handleClose, handleOnClick, handleActions } = tour;

  if (!userInfo || !currentStep || !openState) return null;

  const sharedProps = {
    store,
    onClose: handleClose,
    handleOnClick,
    handleActions,
    key: currentStep.id,
  };

  if (currentStep.type === StepContentType.TOOLTIP && triggerRef) {
    return <TourPopper {...sharedProps} />;
  }

  if (currentStep.type === StepContentType.MODAL) {
    return <TourModal {...sharedProps} />;
  }

  return null;
};
