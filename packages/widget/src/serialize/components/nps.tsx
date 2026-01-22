// NPS serialize component for SDK rendering

import type { ContentEditorNPSElement } from '@usertour/types';
import { memo } from 'react';

import { NPSLabels, NPSScale } from '../../question';
import { useSerializeClick } from '../hooks';

export interface NPSSerializeProps {
  element: ContentEditorNPSElement;
  onClick?: (element: ContentEditorNPSElement, value: number) => Promise<void>;
}

export const NPSSerialize = memo<NPSSerializeProps>((props) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useSerializeClick(element, onClick);

  return (
    <div className="w-full">
      <NPSScale onClick={loading ? undefined : handleClick} />
      <NPSLabels lowLabel={element.data.lowLabel} highLabel={element.data.highLabel} />
    </div>
  );
});

NPSSerialize.displayName = 'NPSSerialize';
