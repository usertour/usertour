import {
  ContentEditorSerialize,
  PopperMadeWith,
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour-packages/widget';
import {
  ContentEditorClickableElement,
  LauncherActionType,
  LauncherData,
  LauncherPositionType,
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
  handleActivate: () => void;
  onTooltipClose: () => void;
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
  handleActivate: () => void,
  handleActions: (actions: RulesCondition[]) => void,
  popperRef: React.RefObject<HTMLDivElement>,
): LauncherHandlers => {
  return useMemo(
    () => ({
      handleClick: () => {
        handleActivate();
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setOpen(true);
        } else if (data) {
          handleActions(data.behavior.actions);
        }
      },
      handleMouseEnter: () => {
        handleActivate();
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
    [data, actionType, setOpen, handleActivate, handleActions, popperRef],
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
  handleActivate,
  onTooltipClose,
  removeBranding,
}: LauncherWidgetCoreProps) => {
  const actionType = data?.behavior?.actionType;
  const [open, setOpen] = useState(false);
  const popperRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(open);

  const triggerRef = useMemo(() => {
    const ref = { current: null as HTMLElement | null };
    if (el instanceof Element) {
      ref.current = el as HTMLElement;
    }
    return ref;
  }, [el]);

  // Handle tooltip close callback when open changes from true to false
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      onTooltipClose();
    }
    prevOpenRef.current = open;
  }, [open, onTooltipClose]);

  const handlers = useLauncherHandlers(
    data,
    actionType,
    setOpen,
    handleActivate,
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
          data.tooltip.reference === LauncherPositionType.LAUNCHER ? launcherRef : triggerRef
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
      handleActivate={launcher.handleActivate}
      handleActions={(actions) => launcher.handleActions(actions)}
      themeSettings={themeSettings}
      zIndex={zIndex}
      handleOnClick={launcher.handleOnClick}
      userAttributes={userAttributes}
      onTooltipClose={launcher.onTooltipClose}
      el={triggerRef}
      removeBranding={removeBranding}
    />
  );
};
