import { useState, useEffect, useRef, useMemo } from 'react';
import type { Placement } from '@floating-ui/dom';

interface Size {
  width: number;
  height: number;
}

interface UsePopperAnimationOptions {
  stableThreshold?: number;
  offset?: number;
  animationDuration?: number;
  easing?: string;
  enabled?: boolean;
  /** The surface's size and the viewport's: with both, the surface never starts off screen. */
  size?: Size;
  viewport?: Size;
}

interface UsePopperAnimationReturn {
  finalStyles: React.CSSProperties;
  animationPhase: 'offset' | 'animating';
  isStable: boolean;
}

// Parse transform to get coordinates
const parseTransform = (transform: string) => {
  const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
  return match
    ? { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) }
    : { x: 0, y: 0 };
};

// Calculate offset transform based on placement
const getOffsetTransform = (
  transform: string,
  placement: Placement,
  offset = 20,
  size?: Size,
  viewport?: Size,
) => {
  const { x, y } = parseTransform(transform);
  // The surface slides in from further out, but only as far out as the viewport has room:
  // against the viewport's edge it would start past it, cut off until it has slid back.
  const room =
    size && viewport
      ? {
          top: y,
          left: x,
          bottom: viewport.height - y - size.height,
          right: viewport.width - x - size.width,
        }
      : undefined;
  const within = (side: keyof NonNullable<typeof room>) =>
    room ? Math.max(0, Math.min(offset, room[side])) : offset;

  let offsetX = x;
  let offsetY = y;

  if (placement.startsWith('bottom')) {
    offsetY = y + within('bottom'); // Offset downward
  } else if (placement.startsWith('top')) {
    offsetY = y - within('top'); // Offset upward
  } else if (placement.startsWith('left')) {
    offsetX = x - within('left'); // Offset leftward
  } else if (placement.startsWith('right')) {
    offsetX = x + within('right'); // Offset rightward
  }

  return `translate(${offsetX}px, ${offsetY}px)`;
};

export const usePopperAnimation = (
  floatingStyles: React.CSSProperties,
  placement: Placement,
  options: UsePopperAnimationOptions = {},
): UsePopperAnimationReturn => {
  const {
    stableThreshold = 250,
    offset = 20,
    animationDuration = 500,
    easing = 'cubic-bezier(0.25, 0.8, 0.5, 1)',
    enabled = true,
    size,
    viewport,
  } = options;
  const { width, height } = size ?? {};
  const { width: viewportWidth, height: viewportHeight } = viewport ?? {};

  // Animation state management
  const [animationPhase, setAnimationPhase] = useState<'offset' | 'animating'>('offset');
  const [lastTransform, setLastTransform] = useState('');
  const stableTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset animation phase when placement changes
  useEffect(() => {
    setAnimationPhase('offset');
    setLastTransform(''); // Reset lastTransform to ensure stability detection works

    // Clear any existing timer when placement changes
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
    }
  }, [placement]);

  // Detect position stability using setTimeout
  useEffect(() => {
    // If animation is disabled, skip the effect
    if (!enabled) {
      return;
    }

    const currentTransform = floatingStyles.transform as string;
    if (currentTransform && currentTransform !== lastTransform) {
      setLastTransform(currentTransform);

      // Clear previous timer
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
      }

      // Set new timer
      stableTimerRef.current = setTimeout(() => {
        if (animationPhase === 'offset') {
          setAnimationPhase('animating');
        }
      }, stableThreshold);

      return () => {
        if (stableTimerRef.current) {
          clearTimeout(stableTimerRef.current);
        }
      };
    }

    if (currentTransform && lastTransform && currentTransform === lastTransform) {
      // If transform is stable (same as last), also set timer
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
      }

      stableTimerRef.current = setTimeout(() => {
        if (animationPhase === 'offset') {
          setAnimationPhase('animating');
        }
      }, stableThreshold);
    }
  }, [floatingStyles.transform, animationPhase, stableThreshold, enabled]);

  // Calculate final styles based on animation phase
  const finalStyles = useMemo(() => {
    // If animation is disabled, return original styles immediately
    if (!enabled) {
      return floatingStyles;
    }

    if (animationPhase === 'offset') {
      // Offset position, no animation
      return {
        ...floatingStyles,
        transform: floatingStyles.transform
          ? getOffsetTransform(
              floatingStyles.transform as string,
              placement,
              offset,
              width !== undefined && height !== undefined ? { width, height } : undefined,
              viewportWidth !== undefined && viewportHeight !== undefined
                ? { width: viewportWidth, height: viewportHeight }
                : undefined,
            )
          : floatingStyles.transform,
        transition: 'none',
      };
    }

    // Final position, with animation
    return {
      ...floatingStyles,
      transition: `opacity 250ms linear, transform ${animationDuration}ms ${easing}`,
    };
  }, [
    floatingStyles,
    placement,
    animationPhase,
    offset,
    animationDuration,
    easing,
    enabled,
    width,
    height,
    viewportWidth,
    viewportHeight,
  ]);

  return {
    finalStyles,
    animationPhase: enabled ? animationPhase : 'animating',
    isStable: enabled ? animationPhase === 'animating' : true,
  };
};
