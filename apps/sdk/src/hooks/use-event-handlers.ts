import { LauncherDataType, LauncherTriggerEvent } from '@usertour/types';
import { LauncherTriggerElement } from '@usertour/types';
import { LauncherData } from '@usertour/types';
import { useEffect } from 'react';
import { off, on } from '../utils/listener';

/**
 * The element that triggers a launcher. A hidden launcher has nothing of its
 * own to click or hover, so its target triggers it whatever the setting says:
 * the builder leaves that on "launcher" when the type is switched to hidden.
 */
export const getEffectiveTriggerElement = (data: LauncherData): LauncherTriggerElement => {
  if (data.type === LauncherDataType.HIDDEN) {
    return LauncherTriggerElement.TARGET;
  }
  return data.behavior.triggerElement;
};

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
    const { triggerEvent } = data.behavior;
    const triggerElement = getEffectiveTriggerElement(data);

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
