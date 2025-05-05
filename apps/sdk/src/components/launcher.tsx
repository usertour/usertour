import { PopperMadeWith } from '@usertour-ui/sdk';
import { LauncherContentWrapper, LauncherPopperContent } from '@usertour-ui/sdk/src/launcher';
import { LauncherPopperContentPotal } from '@usertour-ui/sdk/src/launcher';
import { LauncherPopper } from '@usertour-ui/sdk/src/launcher';
import { LauncherRoot } from '@usertour-ui/sdk/src/launcher';
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
import { on } from '../utils/listener';
import { off } from '../utils/listener';

interface LauncherWidgetCoreProps {
  data: LauncherData;
  handleActions: (actions: RulesCondition[]) => void;
  el: HTMLElement;
  theme: Theme;
  zIndex: number;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => void;
  userInfo: BizUserInfo;
  handleActive: () => void;
  removeBranding: boolean;
}

const LauncherWidgetCore = (props: LauncherWidgetCoreProps) => {
  const {
    data,
    handleActions,
    el,
    theme,
    zIndex,
    handleOnClick,
    userInfo,
    handleActive,
    removeBranding,
  } = props;
  const actionType = data?.behavior?.actionType;
  const [open, setOpen] = useState(false);
  const popperRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(el);

  const handlers = useMemo(
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
    [data, actionType, setOpen],
  );

  useEventHandlers(data, launcherRef, triggerRef, handlers);

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
  }, [open]);

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
  }, [actionType]);

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
      </LauncherPopper>
      <LauncherContentWrapper zIndex={zIndex} referenceRef={triggerRef} ref={launcherRef} />
    </LauncherRoot>
  );
};

export const LauncherWidget = (props: { launcher: Launcher }) => {
  const { launcher } = props;
  const store = launcher.getStore();
  const { userInfo, content, zIndex, theme, triggerRef, openState, sdkConfig } =
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const data = content?.data as LauncherData | undefined;

  if (!theme || !data || !triggerRef || !openState || !triggerRef) {
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
