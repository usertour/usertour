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

interface ModalPosition {
  box: {
    zIndex: string;
    inset: string;
    borderTopLeftRadius: string;
    borderTopRightRadius: string;
    borderBottomRightRadius: string;
    borderBottomLeftRadius: string;
  };
  top: {
    zIndex: string;
    width: string;
    height: string;
  };
  right: {
    zIndex: string;
    left: string;
    height: string;
  };
  bottom: {
    zIndex: string;
    left: string;
    top: string;
  };
  left: {
    zIndex: string;
    width: string;
    top: string;
  };
  default: {
    zIndex: string;
  };
}

/**
 * Calculate the position and dimensions for a modal and its backdrop elements
 * @param reference - The reference element
 * @param rect - The rectangle dimensions of the reference element
 * @param modalOverlayOpeningPadding - Padding around the opening
 * @param modalOverlayOpeningRadius - Border radius for the opening
 * @returns Object containing positioning information for modal and backdrop elements
 */
export function positionModal(
  reference: Element,
  rect: Rect,
  modalOverlayOpeningPadding?: number,
  modalOverlayOpeningRadius?: {
    borderTopLeftRadius: string;
    borderTopRightRadius: string;
    borderBottomRightRadius: string;
    borderBottomLeftRadius: string;
  },
): ModalPosition {
  const DEFAULT_Z_INDEX = '9999';
  const referenceRect = rect;
  const targetStyle = getComputedStyle(reference);

  // Get border radius from target element or use provided radius
  const targetBorderRadius = {
    borderTopLeftRadius: targetStyle.borderTopLeftRadius,
    borderTopRightRadius: targetStyle.borderTopRightRadius,
    borderBottomRightRadius: targetStyle.borderBottomRightRadius,
    borderBottomLeftRadius: targetStyle.borderBottomLeftRadius,
  };
  const borderRadius = modalOverlayOpeningRadius || targetBorderRadius;

  // Calculate padding
  const openingPadding = parseOpeningPadding(modalOverlayOpeningPadding);
  const horizontalPadding = openingPadding.paddingLeft + openingPadding.paddingRight;
  const verticalPadding = openingPadding.paddingTop + openingPadding.paddingBottom;

  // Calculate rectangle dimensions with padding
  const paddedRect = {
    width: referenceRect.width + horizontalPadding,
    height: referenceRect.height + verticalPadding,
    x: referenceRect.x - openingPadding.paddingLeft,
    y: referenceRect.y - openingPadding.paddingTop,
  };

  // Get viewport dimensions
  const viewport = {
    width:
      ('BackCompat' === document.compatMode ? document.body : document.documentElement)
        .clientWidth || window.innerWidth,
    height:
      ('BackCompat' === document.compatMode ? document.body : document.documentElement)
        .clientHeight || window.innerHeight,
  };

  // Calculate zoom factor
  const zoom = getBodyZoom();

  // Calculate inset values
  const inset = {
    top: paddedRect.y,
    right: (viewport.width - paddedRect.x * zoom - paddedRect.width * zoom) / zoom,
    bottom: (viewport.height - paddedRect.y * zoom - paddedRect.height * zoom) / zoom,
    left: paddedRect.x,
  };

  // Calculate dimensions for each section
  const dimensions = {
    top: {
      width: inset.left + paddedRect.width,
      height: inset.top,
    },
    right: {
      left: inset.left + paddedRect.width,
      height: viewport.height - inset.bottom,
    },
    bottom: {
      left: inset.left,
      top: inset.top + paddedRect.height,
    },
    left: {
      width: inset.left,
      top: inset.top,
    },
  };

  return {
    box: {
      zIndex: DEFAULT_Z_INDEX,
      inset: `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`,
      ...borderRadius,
    },
    top: {
      zIndex: DEFAULT_Z_INDEX,
      width: `${dimensions.top.width}px`,
      height: `${dimensions.top.height}px`,
    },
    right: {
      zIndex: DEFAULT_Z_INDEX,
      left: `${dimensions.right.left}px`,
      height: `${dimensions.right.height}px`,
    },
    bottom: {
      zIndex: DEFAULT_Z_INDEX,
      left: `${dimensions.bottom.left}px`,
      top: `${dimensions.bottom.top}px`,
    },
    left: {
      zIndex: DEFAULT_Z_INDEX,
      width: `${dimensions.left.width}px`,
      top: `${dimensions.left.top}px`,
    },
    default: { zIndex: DEFAULT_Z_INDEX },
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
