import { useEffect, useState } from 'react';
import type { ViewportSize } from '../utils/viewport';

const readViewport = (): ViewportSize => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * The viewport's size, followed as it resizes: what a fixed-position surface
 * fits its offsets and its size to (see utils/viewport).
 */
export const useViewportSize = (): ViewportSize => {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return viewport;
};
