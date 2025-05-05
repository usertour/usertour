import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorClickableElement, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import { Align, RulesCondition, Side, StepContentType } from '@usertour-ui/types';
import { useEffect, useSyncExternalStore } from 'react';
import { useRef } from 'react';
import { Tour as TourCore } from '../core/tour';
import { TourStore } from '../types/store';
import { off, on } from '../utils/listener';

type TourSharedProps = {
  store: TourStore;
  onClose: () => void;
  handleOnClick: (element: ContentEditorClickableElement, value?: any) => void;
  handleActions: (actions: RulesCondition[]) => Promise<void>;
};

const PopperContent = ({
  store,
  onClose,
  handleOnClick,
}: Omit<TourSharedProps, 'handleActions'>) => {
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

const TourPopper = ({ store, ...props }: TourSharedProps) => {
  const { openState, zIndex, globalStyle, currentStep, theme, triggerRef, assets } = store;
  const ref = useRef(triggerRef);
  const themeSetting = theme?.settings;

  useEffect(() => {
    if (!ref.current || !currentStep?.target?.actions) return;

    const actions = currentStep.target.actions as RulesCondition[];
    const handler = () => props.handleActions(actions);

    on(ref.current, 'click', handler);
    return () => off(ref.current, 'click', handler);
  }, [ref.current, currentStep?.target?.actions, props.handleActions]);

  if (!currentStep) return null;

  return (
    <SharedPopper.Popper
      triggerRef={ref}
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
        side={
          currentStep?.setting?.alignType === 'auto'
            ? 'bottom'
            : ((currentStep?.setting?.side as Side) ?? 'bottom')
        }
        align={
          currentStep?.setting?.alignType === 'auto'
            ? 'center'
            : ((currentStep?.setting?.align as Align) ?? 'center')
        }
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

const TourModal = (props: TourSharedProps) => {
  const { store, onClose, handleOnClick } = props;
  const { openState, zIndex, globalStyle, currentStep } = store;
  const { assets } = store;

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

export const Tour = ({ tour }: { tour: TourCore }) => {
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
