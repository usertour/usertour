import { PopperMadeWith } from '@usertour-packages/sdk';
import {
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour-packages/sdk/src/launcher';
import {
  ContentEditorClickableElement,
  ContentEditorSerialize,
} from '@usertour-packages/shared-editor';
import {
  LauncherActionType,
  LauncherData,
  LauncherTriggerElement,
  RulesCondition,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useEventHandlers } from '../hooks/use-event-handlers';
import { document } from '../utils/globals';
import { on, off } from '../utils/listener';
import { UsertourLauncher } from '@/core/usertour-launcher';

// Types
type LauncherWidgetProps = {
  launcher: UsertourLauncher;
};

type LauncherWidgetCoreProps = {
  data: LauncherData;
  handleActions: (actions: RulesCondition[]) => void;
  el: HTMLElement;
  themeSettings: ThemeTypesSetting;
  zIndex: number;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => Promise<void>;
  userAttributes: UserTourTypes.Attributes;
  handleActive: () => void;
  removeBranding: boolean;
};

type LauncherHandlers = {
  handleClick: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

// Hooks
const useLauncherHandlers = (
  data: LauncherData,
  actionType: LauncherActionType,
  setOpen: (open: boolean) => void,
  handleActive: () => void,
  handleActions: (actions: RulesCondition[]) => void,
  popperRef: React.RefObject<HTMLDivElement>,
): LauncherHandlers => {
  return useMemo(
    () => ({
      handleClick: () => {
        handleActive();
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setOpen(true);
        } else if (data) {
          handleActions(data.behavior.actions);
        }
      },
      handleMouseEnter: () => {
        handleActive();
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setOpen(true);
        } else if (data) {
          handleActions(data.behavior.actions);
        }
      },
      handleMouseLeave: () => {
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setTimeout(() => {
            if (!popperRef.current?.matches(':hover')) {
              setOpen(false);
            }
          }, 100);
        }
      },
    }),
    [data, actionType, setOpen, handleActive, handleActions, popperRef],
  );
};

const useClickOutside = (
  open: boolean,
  popperRef: React.RefObject<HTMLDivElement>,
  setOpen: (open: boolean) => void,
) => {
  useEffect(() => {
    if (!open || !document) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popperRef.current && !popperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    on(document, 'mousedown', handleClickOutside);
    return () => {
      if (document) {
        off(document, 'mousedown', handleClickOutside);
      }
    };
  }, [open, setOpen]);
};

const usePopperMouseLeave = (
  popperRef: React.RefObject<HTMLDivElement>,
  actionType: LauncherActionType,
  setOpen: (open: boolean) => void,
) => {
  useEffect(() => {
    const popper = popperRef.current;
    if (!popper) return;

    const handlePopperMouseLeave = () => {
      if (actionType === LauncherActionType.SHOW_TOOLTIP) {
        setOpen(false);
      }
    };

    on(popper, 'mouseleave', handlePopperMouseLeave);
    return () => {
      off(popper, 'mouseleave', handlePopperMouseLeave);
    };
  }, [actionType, setOpen]);
};

// Custom hook to extract store state
const useLauncherStore = (launcher: UsertourLauncher) => {
  const store = useSyncExternalStore(launcher.subscribe, launcher.getSnapshot);

  if (!store) {
    return null;
  }

  const {
    userAttributes,
    launcherData,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    removeBranding,
    triggerRef,
  } = store;

  if (!launcherData || !openState || !triggerRef) {
    return null;
  }

  return {
    userAttributes,
    launcherData,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    removeBranding,
    triggerRef,
  };
};

// Components
const LauncherTooltip = ({
  data,
  userAttributes,
  handleOnClick,
  removeBranding,
  popperRef,
}: {
  data: LauncherData;
  userAttributes: UserTourTypes.Attributes;
  handleOnClick: (element: ContentEditorClickableElement) => Promise<void>;
  removeBranding: boolean;
  popperRef: React.RefObject<HTMLDivElement>;
}) => (
  <LauncherPopperContentPotal ref={popperRef}>
    <LauncherPopperContent>
      <ContentEditorSerialize
        contents={data.tooltip.content}
        onClick={handleOnClick}
        userAttributes={userAttributes}
      />
      {!removeBranding && <PopperMadeWith />}
    </LauncherPopperContent>
  </LauncherPopperContentPotal>
);

const LauncherWidgetCore = ({
  data,
  handleActions,
  el,
  themeSettings,
  zIndex,
  handleOnClick,
  userAttributes,
  handleActive,
  removeBranding,
}: LauncherWidgetCoreProps) => {
  const actionType = data?.behavior?.actionType;
  const [open, setOpen] = useState(false);
  const popperRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  const triggerRef = useMemo(() => {
    const ref = { current: null as HTMLElement | null };
    if (el instanceof Element) {
      ref.current = el as HTMLElement;
    }
    return ref;
  }, [el]);

  const handlers = useLauncherHandlers(
    data,
    actionType,
    setOpen,
    handleActive,
    handleActions,
    popperRef,
  );
  useEventHandlers(data, launcherRef, triggerRef, handlers);
  useClickOutside(open, popperRef, setOpen);
  usePopperMouseLeave(popperRef, actionType, setOpen);

  return (
    <LauncherRoot themeSettings={themeSettings} data={data}>
      <LauncherPopper
        triggerRef={
          data.behavior.triggerElement === LauncherTriggerElement.LAUNCHER
            ? launcherRef
            : triggerRef
        }
        zIndex={zIndex}
        open={open}
      >
        <LauncherTooltip
          data={data}
          userAttributes={userAttributes}
          handleOnClick={handleOnClick}
          removeBranding={removeBranding}
          popperRef={popperRef}
        />
      </LauncherPopper>
      <LauncherContentWrapper
        zIndex={zIndex}
        referenceRef={triggerRef}
        ref={launcherRef}
        hideWhenDetached={true}
      />
    </LauncherRoot>
  );
};

export const LauncherWidget = ({ launcher }: LauncherWidgetProps) => {
  const store = useLauncherStore(launcher);

  if (!store) {
    return <></>;
  }

  const {
    launcherData,
    themeSettings,
    userAttributes,
    openState,
    zIndex,
    removeBranding,
    triggerRef,
  } = store;

  if (!themeSettings || !launcherData || !openState || !userAttributes) {
    return <></>;
  }

  return (
    <LauncherWidgetCore
      data={launcherData}
      handleActive={launcher.handleActive}
      handleActions={launcher.handleActions}
      themeSettings={themeSettings}
      zIndex={zIndex}
      handleOnClick={launcher.handleOnClick}
      userAttributes={userAttributes}
      el={triggerRef}
      removeBranding={removeBranding}
    />
  );
};
