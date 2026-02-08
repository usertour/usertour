import { platform } from '@floating-ui/dom';
import type { Rect } from '@floating-ui/dom';

/** Ref-like object to store the last known reference rect (e.g. React.useRef<Rect | null>) */
export type LastReferenceRectRef = { current: Rect | null };

type GetElementRectsArgs = Parameters<typeof platform.getElementRects>[0];

/**
 * Returns a Floating UI platform that, when the reference element is detached from the DOM,
 * supplies the last known reference rect instead of reading getBoundingClientRect (which
 * would return 0,0). Use this to avoid the popper flashing to the top-left when the
 * reference is temporarily detached (e.g. reflow, host re-render).
 *
 * Caller must clear lastReferenceRectRef when the reference element identity changes
 * (e.g. step/target change) so a previous target's rect is not used.
 */
export function createPlatformWithDetachedReferenceFallback(
  lastReferenceRectRef: LastReferenceRectRef,
) {
  return {
    ...platform,
    async getElementRects(args: GetElementRectsArgs) {
      const result = await platform.getElementRects(args);
      const ref = args.reference;
      if (ref instanceof Element) {
        if (ref.isConnected) {
          lastReferenceRectRef.current = result.reference;
        } else if (lastReferenceRectRef.current != null) {
          return { ...result, reference: lastReferenceRectRef.current };
        }
      }
      return result;
    },
  };
}
