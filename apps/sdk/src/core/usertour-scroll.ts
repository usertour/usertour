import { smoothScroll } from '@usertour/dom';
import type { UserTourTypes } from '@usertour/types';
import { document, window } from '@/utils';

export type ScrollPadding = Required<UserTourTypes.ScrollPadding>;

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/**
 * The padding as the scroll uses it: every side a finite, non-negative number
 * of pixels (anything else counts as 0), or null when no side has any.
 */
export const normalizeScrollPadding = (
  padding: UserTourTypes.ScrollPadding | null | undefined,
): ScrollPadding | null => {
  if (!padding || typeof padding !== 'object') {
    return null;
  }
  const side = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  const normalized = {
    top: side(padding.top),
    right: side(padding.right),
    bottom: side(padding.bottom),
    left: side(padding.left),
  };
  return SIDES.some((name) => normalized[name] > 0) ? normalized : null;
};

/**
 * The default scroll that brings a tooltip's target into view.
 *
 * A target that fits in the visible part of the page is centred in it. A
 * taller one is brought in by its top instead: centred, both its top and its
 * bottom would be off screen, and the user would land in the middle of it.
 *
 * The padding is set as `scroll-padding` on the page's root for the call only.
 * The browser takes the scroll's destination from it when the scroll starts,
 * and applies it to the page's own scrolling, not to a scrolling container or
 * frame the target is in. Whatever the host set inline is put back.
 */
export const scrollTargetIntoView = (el: Element, padding: ScrollPadding | null): void => {
  const pageRoom = (window?.innerHeight ?? 0) - (padding?.top ?? 0) - (padding?.bottom ?? 0);
  const frameRoom = el.ownerDocument.defaultView?.innerHeight ?? pageRoom;
  const block =
    el.getBoundingClientRect().height > Math.min(pageRoom, frameRoom) ? 'start' : 'center';

  const root = document?.documentElement;
  if (!padding || !root) {
    void smoothScroll(el, { block });
    return;
  }

  const saved = SIDES.map((side) => {
    const property = `scroll-padding-${side}`;
    return {
      property,
      value: root.style.getPropertyValue(property),
      priority: root.style.getPropertyPriority(property),
    };
  });
  for (const side of SIDES) {
    root.style.setProperty(`scroll-padding-${side}`, `${padding[side]}px`, 'important');
  }
  try {
    void smoothScroll(el, { block });
  } finally {
    for (const { property, value, priority } of saved) {
      if (value) {
        root.style.setProperty(property, value, priority);
      } else {
        root.style.removeProperty(property);
      }
    }
  }
};
