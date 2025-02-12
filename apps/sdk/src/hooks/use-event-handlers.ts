import { LauncherTriggerEvent } from '@usertour-ui/types';
import { LauncherTriggerElement } from '@usertour-ui/types';
import { LauncherData } from '@usertour-ui/types';
import { useEffect } from 'react';
import { off, on } from '../utils/listener';

// Custom hook for event handling
export const useEventHandlers = (
  data: LauncherData | undefined,
  launcherRef: React.RefObject<HTMLDivElement>,
  triggerRef: React.RefObject<HTMLElement | undefined>,
  handlers: {
    handleClick: () => void;
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
  },
) => {
  useEffect(() => {
    if (!data) return;
    const launcher = launcherRef.current;
    const trigger = triggerRef.current;
    const { triggerElement, triggerEvent } = data.behavior;

    const shouldBindLauncher = triggerElement !== LauncherTriggerElement.TARGET;
    const shouldBindTrigger = triggerElement !== LauncherTriggerElement.LAUNCHER;
    const isClickTrigger = triggerEvent === LauncherTriggerEvent.CLICKED;

    // Bind events helper
    const bindEvents = (element: HTMLElement) => {
      if (isClickTrigger) {
        on(element, 'click', handlers.handleClick);
      } else {
        on(element, 'mouseenter', handlers.handleMouseEnter);
        on(element, 'mouseleave', handlers.handleMouseLeave);
      }
    };

    // Unbind events helper
    const unbindEvents = (element: HTMLElement) => {
      if (isClickTrigger) {
        off(element, 'click', handlers.handleClick);
      } else {
        off(element, 'mouseenter', handlers.handleMouseEnter);
        off(element, 'mouseleave', handlers.handleMouseLeave);
      }
    };

    // Bind events to elements
    if (shouldBindLauncher && launcher) bindEvents(launcher);
    if (shouldBindTrigger && trigger) bindEvents(trigger);

    return () => {
      if (shouldBindLauncher && launcher) unbindEvents(launcher);
      if (shouldBindTrigger && trigger) unbindEvents(trigger);
    };
  }, [
    data,
    launcherRef,
    triggerRef,
    handlers.handleClick,
    handlers.handleMouseEnter,
    handlers.handleMouseLeave,
  ]);
};
