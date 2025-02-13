import { getComputedStyle } from '@usertour-ui/dom';

import type { Rect, SideObject } from '@floating-ui/dom';

function getBodyZoom() {
  const styles: any = getComputedStyle(window.document.body);
  if (styles.zoom && '1' !== styles.zoom) {
    const z = Number.parseFloat(styles.zoom);
    if (!Number.isNaN(z)) {
      return z;
    }
  }
  return 1;
}

// function parseCssPropertyToFloat(str: string) {
//   return str ? parseFloat(str.replace(/px$/, '')) : 0;
// }

function parseOpeningPadding(openingPadding: any) {
  const isHasKeys = openingPadding && Object.keys(openingPadding).length > 0;
  const singlePadding = isHasKeys ? 0 : openingPadding;
  const padding = {
    paddingLeft: singlePadding,
    paddingRight: singlePadding,
    paddingTop: singlePadding,
    paddingBottom: singlePadding,
  };
  if (isHasKeys) {
    return { ...padding, ...openingPadding };
  }
  return padding;
}

export const getViewportRect = (): Rect => {
  const width =
    ('BackCompat' === document.compatMode ? document.body : document.documentElement).clientWidth ||
    window.innerWidth;
  const height =
    ('BackCompat' === document.compatMode ? document.body : document.documentElement)
      .clientHeight || window.innerHeight;
  return { width, height, x: 0, y: 0 };
};

export function positionModal(
  reference: Element,
  rect: Rect,
  zIndex: number,
  viewportRect: Rect,
  modalOverlayOpeningPadding?: number,
  modalOverlayOpeningRadius?: any,
) {
  // const { y, height } = _getVisibleHeight(targetElement, scrollParent);
  // const { x, width, left } = targetElement.getBoundingClientRect();
  const defaultIndex = zIndex;
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
  const { width, height } = rrect;
  const viewWidth = viewportRect.width;
  const viewHeight = viewportRect.height;

  const x = Math.max(rrect.x - viewportRect.x, 0);
  const y = Math.max(rrect.y - viewportRect.y, 0);
  //支持目标网页缩放时的选择框计算
  const z = getBodyZoom();
  const inset_top = y;
  const inset_right = (viewWidth - x * z - width * z) / z;
  const inset_bottom = (viewHeight - y * z - height * z) / z;
  const inset_left = x;
  const top_width = inset_left + width;
  const top_height = inset_top;
  const right_left = top_width;
  const right_height = viewHeight - inset_bottom;
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

export const getReClippingRect = (rect: Rect, overflow: SideObject) => {
  const { top, bottom, left, right } = overflow;
  const __rect = { ...rect };
  if (overflow.top > 0) {
    __rect.height -= top;
    __rect.y += top;
  }
  if (overflow.bottom > 0) {
    __rect.height -= bottom;
  }
  if (overflow.left > 0) {
    __rect.width -= left;
    __rect.x += left;
  }
  if (overflow.right > 0) {
    __rect.width -= right;
  }
  return __rect;
};
