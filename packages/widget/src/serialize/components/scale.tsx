// Scale serialize component for SDK rendering

import type { ContentEditorScaleElement } from '@usertour/types';
import { memo } from 'react';

import { Scale } from '../../question';
import { useSerializeClick } from '../hooks';

export interface ScaleSerializeProps {
  element: ContentEditorScaleElement;
  onClick?: (element: ContentEditorScaleElement, value: number) => Promise<void>;
}

export const ScaleSerialize = memo<ScaleSerializeProps>((props) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useSerializeClick(element, onClick);

  return (
    <Scale
      lowRange={element.data.lowRange}
      highRange={element.data.highRange}
      lowLabel={element.data.lowLabel}
      highLabel={element.data.highLabel}
      onValueChange={loading ? undefined : handleClick}
      isInteractive={true}
    />
  );
});

ScaleSerialize.displayName = 'ScaleSerialize';
