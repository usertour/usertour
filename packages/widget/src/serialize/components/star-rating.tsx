// Star rating serialize component for SDK rendering

import type { ContentEditorStarRatingElement } from '@usertour/types';
import { memo, useCallback, useMemo, useState } from 'react';

import { StarRating } from '../../question';
import { useSerializeClick } from '../hooks';

export interface StarRatingSerializeProps {
  element: ContentEditorStarRatingElement;
  onClick?: (element: ContentEditorStarRatingElement, value: number) => Promise<void>;
}

export const StarRatingSerialize = memo<StarRatingSerializeProps>((props) => {
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
});

StarRatingSerialize.displayName = 'StarRatingSerialize';
