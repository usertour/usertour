// Serialize component for scale (read-only mode for SDK)

import { Scale } from '@usertour-packages/widget';
import { memo, useCallback } from 'react';

import type { ContentEditorScaleElement } from '../../../types/editor';
import { useSerializeClick } from '../../hooks';

export interface ContentEditorScaleSerializeProps {
  element: ContentEditorScaleElement;
  onClick?: (element: ContentEditorScaleElement, value: number) => Promise<void>;
}

export const ContentEditorScaleSerialize = memo<ContentEditorScaleSerializeProps>((props) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useSerializeClick(element, onClick);

  const handleScaleClick = useCallback(
    (value: number) => {
      if (!loading) {
        handleClick(value);
      }
    },
    [loading, handleClick],
  );

  return (
    <Scale
      lowRange={element.data.lowRange}
      highRange={element.data.highRange}
      lowLabel={element.data.lowLabel}
      highLabel={element.data.highLabel}
      onValueChange={loading ? undefined : handleScaleClick}
      isInteractive={true}
    />
  );
});

ContentEditorScaleSerialize.displayName = 'ContentEditorScaleSerialize';
