import { Middleware, Placement } from '@floating-ui/react';
import { CSSProperties } from 'react';
import { Align, Side } from '@usertour/types';

const defaultStyle: CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
};
export const computePositionStyle = (placement: string, offsetX: number, offsetY: number) => {
  if (placement === 'center') {
    return defaultStyle;
  }
  let customStyle: CSSProperties = {
    position: 'fixed',
    left: 'auto',
    top: 'auto',
    bottom: 'auto',
    right: 'auto',
  };
  if (placement === 'leftTop') {
    customStyle = {
      ...customStyle,
      left: `${offsetX}px`,
      top: `${offsetY}px`,
    };
  } else if (placement === 'leftBottom') {
    customStyle = {
      ...customStyle,
      left: `${offsetX}px`,
      bottom: `${offsetY}px`,
    };
  } else if (placement === 'rightTop') {
    customStyle = {
      ...customStyle,
      right: `${offsetX}px`,
      top: `${offsetY}px`,
    };
  } else if (placement === 'rightBottom') {
    customStyle = {
      ...customStyle,
      right: `${offsetX}px`,
      bottom: `${offsetY}px`,
    };
  } else if (placement === 'centerBottom') {
    customStyle = {
      ...customStyle,
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: `${offsetY}px`,
    };
  } else if (placement === 'centerTop') {
    customStyle = {
      ...customStyle,
      left: '50%',
      transform: 'translateX(-50%)',
      top: `${offsetY}px`,
    };
  }
  return customStyle;
};

export const transformOrigin = (options: {
  arrowWidth: number;
  arrowHeight: number;
}): Middleware => ({
  name: 'transformOrigin',
  options,
  fn(data) {
    const { placement, rects, middlewareData } = data;

    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
    const isArrowHidden = cannotCenterArrow;
    const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
    const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;

    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
    const noArrowAlign = { start: '0%', center: '50%', end: '100%' }[placedAlign];

    const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
    const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;

    let x = '';
    let y = '';

    if (placedSide === 'bottom') {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${-arrowHeight}px`;
    } else if (placedSide === 'top') {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${rects.floating.height + arrowHeight}px`;
    } else if (placedSide === 'right') {
      x = `${-arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    } else if (placedSide === 'left') {
      x = `${rects.floating.width + arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    }
    return { data: { x, y } };
  },
});

export function getSideAndAlignFromPlacement(placement: Placement) {
  const [side, align = 'center'] = placement.split('-');
  return [side as Side, align as Align] as const;
}
