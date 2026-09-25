import {
  ContentEditorSerialize,
  LinkDecoratorContext,
  PopperContentFrame,
  PopperMadeWith,
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContentPotal,
  LauncherRoot,
  WidgetLocaleProvider,
} from '@usertour/widget';
import {
  ContentEditorClickableElement,
  LauncherActionType,
  LauncherData,
  LauncherPositionType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  RulesCondition,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useEventHandlers } from '../hooks/use-event-handlers';
import { document } from '../utils/globals';
import { on, off } from '../utils/listener';
import { UsertourLauncher } from '@/core/usertour-launcher';
import { AssetAttributes } from '@usertour/frame';

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
  linkUrlDecorator?: ((url: string) => string) | null;
  assets?: AssetAttributes[];
};

type LauncherHandlers = {
  handleClick: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

// Hooks

/** How long a hover tooltip waits after the pointer leaves before closing. */
const TOOLTIP_CLOSE_GRACE_MS = 100;

/**
 * Whether the pointer is still on the tooltip or on an element that opens it
 * (the launcher and/or the target, as the launcher is configured). Leaving
 * any of them only closes the tooltip when the pointer is on none of them.
 */
const isPointerOnTooltipOrTrigger = (
  data: LauncherData,
  popper: HTMLElement | null,
  launcher: HTMLElement | null,
  target: HTMLElement | null,
) => {
  const { triggerElement } = data.behavior;
  return [
    popper,
    triggerElement !== LauncherTriggerElement.TARGET ? launcher : null,
    triggerElement !== LauncherTriggerElement.LAUNCHER ? target : null,
  ].some((element) => element?.matches(':hover'));
};

const useLauncherHandlers = (
  data: LauncherData,
  actionType: LauncherActionType,
  setOpen: (open: boolean) => void,
  handleActivate: () => void,
  handleActions: (actions: RulesCondition[]) => void,
  popperRef: React.RefObject<HTMLDivElement>,
  launcherRef: React.RefObject<HTMLDivElement>,
  triggerRef: React.RefObject<HTMLElement>,
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
            if (
              !isPointerOnTooltipOrTrigger(
                data,
                popperRef.current,
                launcherRef.current,
                triggerRef.current,
              )
            ) {
              setOpen(false);
            }
          }, TOOLTIP_CLOSE_GRACE_MS);
        }
      },
    }),
    [data, actionType, setOpen, handleActivate, handleActions, popperRef, launcherRef, triggerRef],
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
  launcherRef: React.RefObject<HTMLDivElement>,
  triggerRef: React.RefObject<HTMLElement>,
  data: LauncherData,
  open: boolean,
  setOpen: (open: boolean) => void,
) => {
  useEffect(() => {
    const popper = popperRef.current;
    const { actionType, triggerEvent } = data.behavior;
    // Only a hover launcher closes when the pointer leaves its tooltip; a click
    // launcher's tooltip stays open until a click outside it. Bound while open:
    // before that the tooltip is not rendered and popperRef is still null.
    if (
      !open ||
      !popper ||
      actionType !== LauncherActionType.SHOW_TOOLTIP ||
      triggerEvent !== LauncherTriggerEvent.HOVERED
    ) {
      return;
    }

    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const handlePopperMouseLeave = () => {
      clearTimeout(closeTimer);
      // Same rule as leaving the launcher; also covers entering the tooltip's
      // own iframe, which can report a leave.
      closeTimer = setTimeout(() => {
        if (!isPointerOnTooltipOrTrigger(data, popper, launcherRef.current, triggerRef.current)) {
          setOpen(false);
        }
      }, TOOLTIP_CLOSE_GRACE_MS);
    };

    on(popper, 'mouseleave', handlePopperMouseLeave);
    return () => {
      clearTimeout(closeTimer);
      off(popper, 'mouseleave', handlePopperMouseLeave);
    };
  }, [open, data, popperRef, launcherRef, triggerRef, setOpen]);
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
    linkUrlDecorator,
    userLocale,
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
    linkUrlDecorator,
    userLocale,
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
    <PopperContentFrame>
      <ContentEditorSerialize
        contents={data.tooltip.content}
        onClick={handleOnClick}
        userAttributes={userAttributes}
      />
      {!removeBranding && <PopperMadeWith />}
    </PopperContentFrame>
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
  linkUrlDecorator,
  assets,
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
    launcherRef,
    triggerRef,
  );
  useEventHandlers(data, launcherRef, triggerRef, handlers);
  useClickOutside(open, popperRef, setOpen);
  usePopperMouseLeave(popperRef, launcherRef, triggerRef, data, open, setOpen);

  return (
    <LinkDecoratorContext.Provider value={linkUrlDecorator || null}>
      <LauncherRoot themeSettings={themeSettings} data={data}>
        <LauncherPopper
          triggerRef={
            data.tooltip.reference === LauncherPositionType.LAUNCHER ? launcherRef : triggerRef
          }
          zIndex={zIndex}
          open={open}
          isIframeMode={true}
          assets={assets}
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
    </LinkDecoratorContext.Provider>
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
    linkUrlDecorator,
    userLocale,
    assets,
  } = store;

  if (!themeSettings || !launcherData || !openState || !userAttributes) {
    return <></>;
  }

  return (
    <WidgetLocaleProvider locale={userLocale}>
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
        linkUrlDecorator={linkUrlDecorator}
        assets={assets}
      />
    </WidgetLocaleProvider>
  );
};
