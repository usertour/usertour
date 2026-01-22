// Button serialize component for SDK rendering

import type { ContentEditorButtonElement } from '@usertour/types';
import { memo, useCallback, useMemo, useState } from 'react';

import { Button } from '../../primitives';
import type { MarginStyleProps } from '../types';
import { transformMarginStyle } from '../utils';

// Valid button variants for widget Button component
type ValidButtonVariant = 'default' | 'secondary' | undefined;

// Map element type to valid button variant
const mapButtonVariant = (type?: string): ValidButtonVariant => {
  if (type === 'default' || type === 'secondary') {
    return type;
  }
  // 'link' and other types default to 'default'
  return undefined;
};

// Utility function for transforming element to style
const transformsStyle = (element: ContentEditorButtonElement): MarginStyleProps => {
  return transformMarginStyle(element.margin);
};

export interface ButtonSerializeProps {
  element: ContentEditorButtonElement;
  onClick?: (element: ContentEditorButtonElement) => Promise<void>;
}

export const ButtonSerialize = memo((props: ButtonSerializeProps) => {
  const { element, onClick } = props;

  const [loading, setLoading] = useState(false);

  const handleOnClick = useCallback(async () => {
    if (onClick) {
      setLoading(true);
      try {
        await onClick(element);
      } finally {
        setLoading(false);
      }
    }
  }, [onClick, element]);

  const buttonStyle = useMemo(() => transformsStyle(element), [element.margin]);
  const buttonVariant = useMemo(() => mapButtonVariant(element.data?.type), [element.data?.type]);

  return (
    <Button
      variant={buttonVariant}
      onClick={handleOnClick}
      className="h-fit"
      style={buttonStyle}
      disabled={loading}
    >
      <span>{element.data?.text}</span>
    </Button>
  );
});

ButtonSerialize.displayName = 'ButtonSerialize';
