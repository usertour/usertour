// Button serialize component for SDK rendering

import type { ContentEditorButtonElement } from '@usertour/types';
import { ButtonSemanticType, DEFAULT_BUTTON_SEMANTIC_TYPE } from '@usertour/types';
import { memo, useCallback, useMemo, useState } from 'react';

import { Button } from '../../primitives';
import { useButtonContext } from '../../core/banner';
import { resolveButtonVariant } from '../../utils/button';
import type { MarginStyleProps } from '../types';
import { transformMarginStyle } from '../utils';

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

  // Detect rendering context (default or banner)
  const buttonContext = useButtonContext();

  // Get semantic type from element, ensure it's valid
  const semanticType: ButtonSemanticType =
    (element.data?.type as ButtonSemanticType) || DEFAULT_BUTTON_SEMANTIC_TYPE;

  // Memoize variant resolution
  const buttonVariant = useMemo(
    () => resolveButtonVariant(semanticType, buttonContext),
    [semanticType, buttonContext],
  );

  // Memoize style transformation
  const buttonStyle = useMemo(() => transformsStyle(element), [element.margin]);

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
