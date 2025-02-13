import { CSSProperties } from 'react';

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
