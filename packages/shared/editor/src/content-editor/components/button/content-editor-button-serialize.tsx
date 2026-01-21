// Read-only serialized component for SDK

import * as Widget from '@usertour-packages/widget';
import { memo, useCallback, useMemo, useState } from 'react';

import type { ContentEditorButtonElement } from '../../../types/editor';
import type { MarginStyleProps } from '../../types';
import { transformMarginStyle } from '../../utils';

// Utility function for transforming element to style
const transformsStyle = (element: ContentEditorButtonElement): MarginStyleProps => {
  return transformMarginStyle(element.margin);
};

export type ContentEditorButtonSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorButtonElement;
  onClick?: (element: ContentEditorButtonElement) => Promise<void>;
};

export const ContentEditorButtonSerialize = memo((props: ContentEditorButtonSerializeType) => {
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

  return (
    <Widget.Button
      variant={element.data?.type as any}
      onClick={handleOnClick}
      className="h-fit"
      style={buttonStyle}
      disabled={loading}
    >
      <span>{element.data?.text}</span>
    </Widget.Button>
  );
});

ContentEditorButtonSerialize.displayName = 'ContentEditorButtonSerialize';
