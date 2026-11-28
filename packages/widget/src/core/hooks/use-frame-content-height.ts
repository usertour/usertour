import { useEffect } from 'react';
import { useFrame } from '@usertour/frame';

/**
 * Sizes the enclosing frame to its content, so the surface hugs it. The frame's
 * CSS caps that height to the viewport; when the cap applies, the content
 * scrolls inside the frame instead of being clipped.
 */
export const useFrameContentHeight = (height: number | undefined) => {
  const { setStyle, document: frameDocument, window: frameWindow } = useFrame();

  // Lay the content out at the frame's full width, scrollbar or not: a
  // scrollbar that takes width (Windows, Linux, macOS with a mouse) would
  // otherwise narrow it, and content whose height follows its width (an image
  // at a percentage width, wrapped text) would get shorter, fit, drop the
  // scrollbar, widen and overflow again — the scrollbar flickering on and off
  // for good. The scrollbar sits over the panel's padding instead.
  useEffect(() => {
    const root = frameDocument.documentElement;
    root.style.width = '100vw';
    root.style.overflowX = 'hidden';
  }, [frameDocument]);

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
