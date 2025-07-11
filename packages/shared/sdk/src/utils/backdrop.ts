import { getComputedStyle } from '@usertour-ui/dom';

import type { Rect, SideObject } from '@floating-ui/dom';

/**
 * Get the zoom factor of the body element
 * @returns The zoom factor of the body element (defaults to 1 if zoom is not set or invalid)
 */
function getBodyZoom(): number {
  const zoom = getComputedStyle(window.document.body).getPropertyValue('zoom');
  return zoom && zoom !== '1' ? Number(zoom) || 1 : 1;
}

// function parseCssPropertyToFloat(str: string) {
//   return str ? parseFloat(str.replace(/px$/, '')) : 0;
// }

interface PaddingObject {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

/**
 * Parse opening padding value into a padding object
 * @param openingPadding - Can be either a number for uniform padding or an object with specific padding values
 * @returns A padding object with all sides specified
 */
function parseOpeningPadding(openingPadding?: number | Partial<PaddingObject>): PaddingObject {
  const defaultPadding = {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  };

  // If openingPadding is undefined or null, return default padding
  if (openingPadding == null) {
    return defaultPadding;
  }

  // If openingPadding is a number, apply it uniformly
  if (typeof openingPadding === 'number') {
    return {
      ...defaultPadding,
      paddingLeft: openingPadding,
      paddingRight: openingPadding,
      paddingTop: openingPadding,
      paddingBottom: openingPadding,
    };
  }

  // If openingPadding is an object, merge with default values
  return {
    ...defaultPadding,
    ...openingPadding,
  };
}

/**
 * Get the viewport rectangle dimensions
 * @returns A Rect object containing viewport width, height and position
 */
export const getViewportRect = (): Rect => {
  const isQuirksMode = document.compatMode === 'BackCompat';
  const rootElement = isQuirksMode ? document.body : document.documentElement;

  const width = rootElement.clientWidth || window.innerWidth;
  const height = rootElement.clientHeight || window.innerHeight;

  return {
    width,
    height,
    x: 0,
    y: 0,
  };
};

interface ModalPosition {
  box: {
    zIndex: number;
    inset: string;
    borderTopLeftRadius: string;
    borderTopRightRadius: string;
    borderBottomRightRadius: string;
    borderBottomLeftRadius: string;
  };
  top: {
    zIndex: number;
    width: string;
    height: string;
  };
  right: {
    zIndex: number;
    left: string;
    height: string;
  };
  bottom: {
    zIndex: number;
    left: string;
    top: string;
  };
  left: {
    zIndex: number;
    width: string;
    top: string;
  };
  default: {
    zIndex: number;
  };
}

/**
 * Get border radius styles from an element
 */
function getBorderRadius(element: Element) {
  const style = getComputedStyle(element);
  return {
    borderTopLeftRadius: style.borderTopLeftRadius,
    borderTopRightRadius: style.borderTopRightRadius,
    borderBottomRightRadius: style.borderBottomRightRadius,
    borderBottomLeftRadius: style.borderBottomLeftRadius,
  };
}

/**
 * Calculate modal position and dimensions
 * @param reference - The reference element
 * @param rect - The reference element's rectangle
 * @param zIndex - The z-index value
 * @param viewportRect - The viewport rectangle
 * @param modalOverlayOpeningPadding - Optional padding around the opening
 * @param modalOverlayOpeningRadius - Optional border radius for the opening
 * @returns Object containing positioning information for all modal parts
 */
export function positionModal(
  reference: Element,
  rect: Rect,
  zIndex: number,
  viewportRect: Rect,
  modalOverlayOpeningPadding?: number,
  modalOverlayOpeningRadius?: any,
): ModalPosition {
  const targetBorderRadius = getBorderRadius(reference);
  const borderRadius = modalOverlayOpeningRadius || targetBorderRadius;
  const openingPadding = parseOpeningPadding(modalOverlayOpeningPadding);

  // Calculate padding dimensions
  const horizontalPadding = openingPadding.paddingLeft + openingPadding.paddingRight;
  const verticalPadding = openingPadding.paddingTop + openingPadding.paddingBottom;

  // Calculate adjusted rectangle
  const adjustedRect = {
    width: rect.width + horizontalPadding,
    height: rect.height + verticalPadding,
    x: rect.x - openingPadding.paddingLeft,
    y: rect.y - openingPadding.paddingTop,
  };

  // Calculate viewport-relative position
  const x = Math.max(adjustedRect.x - viewportRect.x, 0);
  const y = Math.max(adjustedRect.y - viewportRect.y, 0);
  const zoom = getBodyZoom();

  // Calculate inset values
  const inset = {
    top: y,
    right: (viewportRect.width - x * zoom - adjustedRect.width * zoom) / zoom,
    bottom: (viewportRect.height - y * zoom - adjustedRect.height * zoom) / zoom,
    left: x,
  };

  // Calculate dimensions for each side
  const dimensions = {
    top: {
      width: inset.left + adjustedRect.width,
      height: inset.top,
    },
    right: {
      left: inset.left + adjustedRect.width,
      height: viewportRect.height - inset.bottom,
    },
    bottom: {
      left: inset.left,
      top: inset.top + adjustedRect.height,
    },
    left: {
      width: inset.left,
      top: inset.top,
    },
  };

  return {
    box: {
      zIndex,
      inset: `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`,
      ...borderRadius,
    },
    top: {
      zIndex,
      width: `${dimensions.top.width}px`,
      height: `${dimensions.top.height}px`,
    },
    right: {
      zIndex,
      left: `${dimensions.right.left}px`,
      height: `${dimensions.right.height}px`,
    },
    bottom: {
      zIndex,
      left: `${dimensions.bottom.left}px`,
      top: `${dimensions.bottom.top}px`,
    },
    left: {
      zIndex,
      width: `${dimensions.left.width}px`,
      top: `${dimensions.left.top}px`,
    },
    default: { zIndex },
  };
}

/**
 * Adjust rectangle dimensions based on overflow values
 * @param rect - The original rectangle to adjust
 * @param overflow - Object containing overflow values for each side
 * @returns A new rectangle with adjusted dimensions
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
