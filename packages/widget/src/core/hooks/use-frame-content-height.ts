import { useEffect } from 'react';
import { useFrame } from '@usertour/frame';

/**
 * Sizes the enclosing frame to its content, so the surface hugs it. The frame's
 * CSS caps that height to the viewport; when the cap applies, the content
 * scrolls inside the frame instead of being clipped.
 */
export const useFrameContentHeight = (height: number | undefined) => {
  const { setStyle, document: frameDocument, window: frameWindow } = useFrame();

  useEffect(() => {
    if (height === undefined) {
      return;
    }
    setStyle(`height: ${height}px !important`);

    // Explicit rather than left to the browser: a frame that fits its content
    // must never show a scrollbar over a sub-pixel difference.
    const syncOverflow = () => {
      const frameHeight = frameWindow?.innerHeight ?? height;
      frameDocument.documentElement.style.overflowY = height - frameHeight > 1 ? 'auto' : 'hidden';
    };
    syncOverflow();
    // The frame's own window resizes whenever the cap changes with the viewport.
    frameWindow?.addEventListener('resize', syncOverflow);
    return () => frameWindow?.removeEventListener('resize', syncOverflow);
  }, [height, setStyle, frameDocument, frameWindow]);
};
