import { useEffect, useState } from 'react';
import { fitOffsetsToViewport } from '../utils/viewport';

const readViewport = () => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * A fixed-position surface's offsets, cut back to what the current viewport
 * has room for (see fitOffsetsToViewport). Follows the viewport as it resizes.
 */
export const useViewportFitOffsets = (
  position: string,
  offsetX: number,
  offsetY: number,
  reservedHeight = 0,
): [number, number] => {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return fitOffsetsToViewport(position, offsetX, offsetY, viewport, reservedHeight);
};
