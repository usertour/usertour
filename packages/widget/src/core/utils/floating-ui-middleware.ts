import { hide } from '@floating-ui/react-dom';
import type { Middleware } from '@floating-ui/dom';
import type { Side } from '@usertour/types';

export interface CustomHideDetectOverflowOptions {
  padding: number | Partial<Record<Side, number>>;
  /** Already filtered to non-null elements (e.g. boundary.filter(isNotNull)). */
  boundary: Element[];
  altBoundary: boolean;
}

/**
 * Custom hide middleware: wraps Floating UI's hide with referenceHidden, and also treats
 * invalid reference rect (0 width/height or 0,0,0,0) as hidden so the floating element is hidden.
 */
export function createCustomHideMiddleware(
  detectOverflowOptions: CustomHideDetectOverflowOptions,
): Middleware {
  return {
    name: 'customHide',
    options: {
      strategy: 'referenceHidden',
      padding: detectOverflowOptions.padding,
      boundary: detectOverflowOptions.boundary,
    },
    async fn(state) {
      const { rects } = state;
      const { boundary, padding, altBoundary } = detectOverflowOptions;
      const originalHide = hide({
        strategy: 'referenceHidden',
        padding,
        boundary: boundary.length > 0 ? boundary : undefined,
        altBoundary,
      });
      const originalResult = await originalHide.fn(state);
      const { width, height, x, y } = rects.reference;
      const isInvalid =
        width === 0 || height === 0 || (x === 0 && y === 0 && width === 0 && height === 0);
      const referenceHidden = originalResult.data?.referenceHidden || isInvalid;
      const escaped = (originalResult.data?.escaped as boolean) ?? false;

      return {
        data: {
          referenceHidden,
          escaped,
        },
      };
    },
  };
}
