// Serialize component for star rating (read-only mode for SDK)

import { StarRating } from '@usertour-packages/widget';
import { memo, useCallback, useMemo, useState } from 'react';

import type { ContentEditorStarRatingElement } from '../../../types/editor';
import { useSerializeClick } from '../../hooks';

export interface ContentEditorStarRatingSerializeProps {
  element: ContentEditorStarRatingElement;
  onClick?: (element: ContentEditorStarRatingElement, value: number) => Promise<void>;
}

export const ContentEditorStarRatingSerialize = memo<ContentEditorStarRatingSerializeProps>(
  (props) => {
    const { element, onClick } = props;
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const { loading, handleClick } = useSerializeClick(element, onClick);

    const scaleLength = useMemo(
      () => element.data.highRange - element.data.lowRange + 1,
      [element.data.highRange, element.data.lowRange],
    );

    const handleStarHover = useCallback((index: number) => {
      setHoveredIndex(index);
    }, []);

    const handleStarLeave = useCallback(() => {
      setHoveredIndex(null);
    }, []);

    return (
      <StarRating
        scaleLength={scaleLength}
        hoveredIndex={hoveredIndex}
        onStarHover={handleStarHover}
        onStarLeave={handleStarLeave}
        onValueChange={loading ? undefined : handleClick}
        lowRange={element.data.lowRange}
        lowLabel={element.data.lowLabel}
        highLabel={element.data.highLabel}
        isInteractive={true}
      />
    );
  },
);

ContentEditorStarRatingSerialize.displayName = 'ContentEditorStarRatingSerialize';
