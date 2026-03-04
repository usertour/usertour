// Button serialize component for SDK rendering

import type { ContentEditorButtonElement } from '@usertour/types';
import { ButtonSemanticType, DEFAULT_BUTTON_SEMANTIC_TYPE } from '@usertour/types';
import { memo, useCallback, useMemo, useState } from 'react';
import { isConditionsActived } from '@usertour/helpers';

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

  const shouldDisable =
    Boolean(element.data?.disableButton) &&
    isConditionsActived(element.data?.disableButtonConditions || []);
  const shouldHide =
    Boolean(element.data?.hideButton) &&
    isConditionsActived(element.data?.hideButtonConditions || []);

  const handleOnClick = useCallback(async () => {
    if (onClick && !shouldDisable) {
      setLoading(true);
      try {
        await onClick(element);
      } finally {
        setLoading(false);
      }
    }
  }, [onClick, element, shouldDisable]);

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

  // If button should be hidden, don't render it
  if (shouldHide) {
    return null;
  }

  return (
    <Button
      variant={buttonVariant}
      onClick={handleOnClick}
      className="h-fit"
      style={buttonStyle}
      disabled={loading || shouldDisable}
    >
      <span>{element.data?.text}</span>
    </Button>
  );
});

ButtonSerialize.displayName = 'ButtonSerialize';
