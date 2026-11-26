import { hide } from '@floating-ui/react-dom';
import type { Middleware } from '@floating-ui/dom';
import { getBoundaryAcrossFrames, hasPointableSize } from '@usertour/dom';
import type { Side } from '@usertour/types';

export interface CustomHideDetectOverflowOptions {
  padding: number | Partial<Record<Side, number>>;
}

/**
 * Custom hide middleware: wraps Floating UI's hide with referenceHidden, and also treats
 * a reference with nothing to point at (neither a width nor a height, as a detached element
 * measures) as hidden, by the same rule the SDK's element watcher keeps content running by.
 * The reference is hidden once its clipping ancestors cut it off; one inside a same-origin
 * frame is clipped in the floating element's window's space instead.
 */
export function createCustomHideMiddleware(
  detectOverflowOptions: CustomHideDetectOverflowOptions,
): Middleware {
  return {
    name: 'customHide',
    options: {
      strategy: 'referenceHidden',
      padding: detectOverflowOptions.padding,
    },
    async fn(state) {
      const { rects } = state;
      const { padding } = detectOverflowOptions;
      const originalHide = hide({
        strategy: 'referenceHidden',
        padding,
        ...(await getBoundaryAcrossFrames(state)),
      });
      const originalResult = await originalHide.fn(state);
      const referenceHidden =
        originalResult.data?.referenceHidden || !hasPointableSize(rects.reference);
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
