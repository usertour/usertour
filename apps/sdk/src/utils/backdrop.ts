import { getComputedStyle } from '@usertour-ui/dom';

import type { Rect, SideObject } from '@floating-ui/dom';

/**
 * Get the zoom level of the body element
 * @returns The zoom level of the body element
 */
function getBodyZoom(): number {
  const styles = getComputedStyle(window.document.body);
  const zoom = styles.zoom;

  if (!zoom || zoom === '1') {
    return 1;
  }

  const zoomValue = Number.parseFloat(zoom);
  return Number.isNaN(zoomValue) ? 1 : zoomValue;
}

/**
 * The padding object
 */
interface PaddingObject {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

/**
 * The opening padding
 */
type OpeningPadding = number | Partial<PaddingObject> | undefined;

/**
 * Parse the opening padding
 * @param openingPadding - The opening padding
 * @returns The parsed opening padding
 */
function parseOpeningPadding(openingPadding?: OpeningPadding): PaddingObject {
  const defaultPadding = {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  };

  if (typeof openingPadding === 'number') {
    return {
      paddingLeft: openingPadding,
      paddingRight: openingPadding,
      paddingTop: openingPadding,
      paddingBottom: openingPadding,
    };
  }

  if (!openingPadding || Object.keys(openingPadding).length === 0) {
    return defaultPadding;
  }

  return {
    ...defaultPadding,
    ...openingPadding,
  };
}

export function positionModal(
  reference: Element,
  rect: Rect,
  modalOverlayOpeningPadding?: number,
  modalOverlayOpeningRadius?: any,
) {
  // const { y, height } = _getVisibleHeight(targetElement, scrollParent);
  // const { x, width, left } = targetElement.getBoundingClientRect();
  const defaultIndex = '9999';
  // const { rects, elements } = state;
  // const referenceRect = elements.reference.getBoundingClientRect();
  const referenceRect = rect;
  const targetStyle = getComputedStyle(reference);
  const targetBorderRadius = {
    borderTopLeftRadius: targetStyle.borderTopLeftRadius,
    borderTopRightRadius: targetStyle.borderTopRightRadius,
    borderBottomRightRadius: targetStyle.borderBottomRightRadius,
    borderBottomLeftRadius: targetStyle.borderBottomLeftRadius,
  };
  const borderRadius = modalOverlayOpeningRadius || targetBorderRadius;
  const openingPadding = parseOpeningPadding(modalOverlayOpeningPadding);
  const horizontalPadding = openingPadding.paddingLeft + openingPadding.paddingRight;
  const verticalPadding = openingPadding.paddingTop + openingPadding.paddingBottom;

  // getBoundingClientRect is not consistent. Some browsers use x and y, while others use left and top
  const rrect = {
    width: referenceRect.width + horizontalPadding,
    height: referenceRect.height + verticalPadding,
    x: referenceRect.x - openingPadding.paddingLeft,
    y: referenceRect.y - openingPadding.paddingTop,
  };
  const { width, height, x = 0, y = 0 } = rrect;
  // const windowRect = getViewportRect(document.documentElement, "fixed")
  // const {width: w, height: h} = windowRect;
  const w =
    ('BackCompat' === document.compatMode ? document.body : document.documentElement).clientWidth ||
    window.innerWidth;
  const h =
    ('BackCompat' === document.compatMode ? document.body : document.documentElement)
      .clientHeight || window.innerHeight;
  const z = getBodyZoom();
  const inset_top = y;
  const inset_right = (w - x * z - width * z) / z;
  const inset_bottom = (h - y * z - height * z) / z;
  const inset_left = x;
  const top_width = inset_left + width;
  const top_height = inset_top;
  const right_left = top_width;
  const right_height = h - inset_bottom;
  const bottom_left = inset_left;
  const bottom_top = inset_top + height;
  const left_width = inset_left;
  const left_top = inset_top;
  // let borderRadiusStyle = `border-top-left-radius:${borderRadius.borderTopLeftRadius};`;
  // borderRadiusStyle += `border-top-right-radius:${borderRadius.borderTopRightRadius};`;
  // borderRadiusStyle += `border-bottom-right-radius:${borderRadius.borderBottomRightRadius};`;
  // borderRadiusStyle += `border-bottom-left-radius:${borderRadius.borderBottomLeftRadius};`;

  return {
    box: {
      zIndex: defaultIndex,
      inset: `${inset_top}px ${inset_right}px ${inset_bottom}px ${inset_left}px`,
      ...borderRadius,
    },
    top: {
      zIndex: defaultIndex,
      width: `${top_width}px`,
      height: `${top_height}px`,
    },
    right: {
      zIndex: defaultIndex,
      left: `${right_left}px`,
      height: `${right_height}px`,
    },
    bottom: {
      zIndex: defaultIndex,
      left: `${bottom_left}px`,
      top: `${bottom_top}px`,
    },
    left: {
      zIndex: defaultIndex,
      width: `${left_width}px`,
      top: `${left_top}px`,
    },
    default: { zIndex: defaultIndex },
  };
}

/**
 * Adjusts a rectangle's dimensions and position based on overflow values
 * @param rect - The original rectangle to adjust
 * @param overflow - Object containing overflow values for each side
 * @returns A new rectangle with adjusted dimensions and position
 */
export const getReClippingRect = (rect: Rect, overflow: SideObject): Rect => {
  const { top, bottom, left, right } = overflow;
  const adjustedRect = { ...rect };

  // Adjust top overflow
  if (top > 0) {
    adjustedRect.height -= top;
    adjustedRect.y += top;
  }

  // Adjust bottom overflow
  if (bottom > 0) {
    adjustedRect.height -= bottom;
  }

  // Adjust left overflow
  if (left > 0) {
    adjustedRect.width -= left;
    adjustedRect.x += left;
  }

  // Adjust right overflow
  if (right > 0) {
    adjustedRect.width -= right;
  }

  return adjustedRect;
};
