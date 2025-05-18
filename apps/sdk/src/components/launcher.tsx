import { PopperMadeWith } from '@usertour-ui/sdk';
import {
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour-ui/sdk/src/launcher';
import { ContentEditorClickableElement, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import {
  BizEvents,
  BizUserInfo,
  LauncherActionType,
  LauncherData,
  LauncherTriggerElement,
  RulesCondition,
  Theme,
} from '@usertour-ui/types';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Launcher } from '../core/launcher';
import { useEventHandlers } from '../hooks/use-event-handlers';
import { document } from '../utils/globals';
import { on, off } from '../utils/listener';

// Types
type LauncherWidgetProps = {
  launcher: Launcher;
};

type LauncherWidgetCoreProps = {
  data: LauncherData;
  handleActions: (actions: RulesCondition[]) => void;
  el: HTMLElement;
  theme: Theme;
  zIndex: number;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => void;
  userInfo: BizUserInfo;
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

// Components
const LauncherTooltip = ({
  data,
  userInfo,
  handleOnClick,
  removeBranding,
  popperRef,
}: {
  data: LauncherData;
  userInfo: BizUserInfo;
  handleOnClick: (element: ContentEditorClickableElement) => void;
  removeBranding: boolean;
  popperRef: React.RefObject<HTMLDivElement>;
}) => (
  <LauncherPopperContentPotal ref={popperRef}>
    <LauncherPopperContent>
      <ContentEditorSerialize
        contents={data.tooltip.content}
        onClick={handleOnClick}
        userInfo={userInfo}
      />
      {!removeBranding && <PopperMadeWith />}
    </LauncherPopperContent>
  </LauncherPopperContentPotal>
);

const LauncherWidgetCore = ({
  data,
  handleActions,
  el,
  theme,
  zIndex,
  handleOnClick,
  userInfo,
  handleActive,
  removeBranding,
}: LauncherWidgetCoreProps) => {
  const actionType = data?.behavior?.actionType;
  const [open, setOpen] = useState(false);
  const popperRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(el);

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
    <LauncherRoot theme={theme} data={data}>
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
          userInfo={userInfo}
          handleOnClick={handleOnClick}
          removeBranding={removeBranding}
          popperRef={popperRef}
        />
      </LauncherPopper>
      <LauncherContentWrapper zIndex={zIndex} referenceRef={triggerRef} ref={launcherRef} />
    </LauncherRoot>
  );
};

export const LauncherWidget = ({ launcher }: LauncherWidgetProps) => {
  const store = launcher.getStore();
  const { userInfo, content, zIndex, theme, triggerRef, openState, sdkConfig } =
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const data = content?.data as LauncherData | undefined;

  if (!theme || !data || !triggerRef || !openState) {
    return null;
  }

  return (
    <LauncherWidgetCore
      data={data}
      handleActive={() => {
        launcher.trigger(BizEvents.LAUNCHER_ACTIVATED);
      }}
      handleActions={launcher.handleActions}
      theme={theme}
      zIndex={zIndex}
      handleOnClick={launcher.handleOnClick}
      userInfo={userInfo as BizUserInfo}
      el={triggerRef}
      removeBranding={sdkConfig.removeBranding}
    />
  );
};
