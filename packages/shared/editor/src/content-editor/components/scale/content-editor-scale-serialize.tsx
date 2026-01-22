// Serialize component for scale (read-only mode for SDK)

import { memo, useCallback } from 'react';

import type { ContentEditorScaleElement } from '../../../types/editor';
import { useQuestionSerialize } from '../../shared';
import { ScaleDisplay } from './scale-display';

export interface ContentEditorScaleSerializeProps {
  element: ContentEditorScaleElement;
  onClick?: (element: ContentEditorScaleElement, value: number) => Promise<void>;
}

export const ContentEditorScaleSerialize = memo<ContentEditorScaleSerializeProps>((props) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useQuestionSerialize(element, onClick);

  const handleScaleClick = useCallback(
    (_el: ContentEditorScaleElement, value: number) => {
      if (!loading) {
        handleClick(value);
      }
    },
    [loading, handleClick],
  );

  return (
    <ScaleDisplay
      lowRange={element.data.lowRange}
      highRange={element.data.highRange}
      lowLabel={element.data.lowLabel}
      highLabel={element.data.highLabel}
      onValueChange={loading ? undefined : handleScaleClick}
      element={element}
    />
  );
});

ContentEditorScaleSerialize.displayName = 'ContentEditorScaleSerialize';
