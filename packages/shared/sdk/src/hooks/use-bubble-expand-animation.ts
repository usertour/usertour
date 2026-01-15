import { useMemo } from 'react';
import type { CSSProperties } from 'react';

type VerticalPosition = 'top' | 'bottom';
type HorizontalPosition = 'left' | 'right';

interface UseBubbleExpandAnimationOptions {
  /** Whether the content is visible/expanded */
  isVisible: boolean;
  /** Vertical anchor position of the avatar */
  vertical: VerticalPosition;
  /** Horizontal anchor position of the avatar */
  horizontal: HorizontalPosition;
  /** Padding value for the avatar space */
  avatarSpacePadding: number;
  /** Offset distance for collapsed state in pixels */
  translateOffset?: number;
  /** Scale value for collapsed state (0-1) */
  collapsedScale?: number;
  /** Duration for expand animation in ms */
  expandDuration?: number;
  /** Duration for collapse animation in ms */
  collapseDuration?: number;
  /** Cubic bezier for expand animation (with bounce effect) */
  expandEasing?: string;
  /** Easing for collapse animation */
  collapseEasing?: string;
}

interface UseBubbleExpandAnimationReturn {
  /** Computed style object for the bubble outline */
  outlineStyle: CSSProperties;
  /** Transform origin value based on avatar position */
  transformOrigin: string;
}

/**
 * Hook to generate expand/collapse animation styles for bubble content
 * Animation expands from avatar corner to opposite corner with scale and opacity
 *
 * @example
 * const { outlineStyle } = useBubbleExpandAnimation({
 *   isVisible: true,
 *   vertical: 'bottom',
 *   horizontal: 'left',
 *   avatarSpacePadding: 80,
 * });
 */
export const useBubbleExpandAnimation = (
  options: UseBubbleExpandAnimationOptions,
): UseBubbleExpandAnimationReturn => {
  const {
    isVisible,
    vertical,
    horizontal,
    avatarSpacePadding,
    translateOffset = 8,
    collapsedScale = 0.85,
    expandDuration = 350,
    collapseDuration = 200,
    expandEasing = 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    collapseEasing = 'ease-in',
  } = options;

  const outlineStyle: CSSProperties = useMemo(() => {
    // Transform origin: animation expands from avatar corner
    const transformOrigin = `${vertical} ${horizontal}`;

    // Calculate slight offset for collapsed state to enhance the animation
    // Offset direction is toward the avatar position
    const translateX = horizontal === 'left' ? `-${translateOffset}px` : `${translateOffset}px`;
    const translateY = vertical === 'bottom' ? `${translateOffset}px` : `-${translateOffset}px`;

    // Scale and translate transform for expand/collapse animation
    const transform = isVisible
      ? 'scale(1) translate(0, 0)'
      : `scale(${collapsedScale}) translate(${translateX}, ${translateY})`;

    // Different easing for expand vs collapse - expand has bounce, collapse is quick
    const opacityExpandDuration = Math.round(expandDuration * 0.85);
    const opacityCollapseDuration = Math.round(collapseDuration * 0.75);

    const transition = isVisible
      ? `transform ${expandDuration}ms ${expandEasing}, opacity ${opacityExpandDuration}ms ease-out`
      : `transform ${collapseDuration}ms ${collapseEasing}, opacity ${opacityCollapseDuration}ms ${collapseEasing}`;

    return {
      ...(vertical === 'bottom'
        ? { paddingBottom: avatarSpacePadding }
        : { paddingTop: avatarSpacePadding }),
      transformOrigin,
      transform,
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' : 'none',
      transition,
    };
  }, [
    isVisible,
    vertical,
    horizontal,
    avatarSpacePadding,
    translateOffset,
    collapsedScale,
    expandDuration,
    collapseDuration,
    expandEasing,
    collapseEasing,
  ]);

  const transformOrigin = `${vertical} ${horizontal}`;

  return {
    outlineStyle,
    transformOrigin,
  };
};
