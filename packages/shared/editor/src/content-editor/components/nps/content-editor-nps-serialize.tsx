// Serialize component for NPS (read-only mode for SDK)

import { memo } from 'react';

import type { ContentEditorNPSElement } from '../../../types/editor';
import { useSerializeClick } from '../../hooks';
import { NPSScale, NPSLabels } from './nps-display';

export interface ContentEditorNPSSerializeProps {
  element: ContentEditorNPSElement;
  onClick?: (element: ContentEditorNPSElement, value: number) => Promise<void>;
}

export const ContentEditorNPSSerialize = memo<ContentEditorNPSSerializeProps>((props) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useSerializeClick(element, onClick);

  return (
    <div className="w-full">
      <NPSScale onClick={loading ? undefined : handleClick} />
      <NPSLabels lowLabel={element.data.lowLabel} highLabel={element.data.highLabel} />
    </div>
  );
});

ContentEditorNPSSerialize.displayName = 'ContentEditorNPSSerialize';
