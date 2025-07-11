import { useState, useEffect, useRef, useMemo } from 'react';
import type { Placement } from '@floating-ui/dom';

interface UsePopperAnimationOptions {
  stableThreshold?: number;
  offset?: number;
  animationDuration?: number;
  easing?: string;
  enabled?: boolean;
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
const getOffsetTransform = (transform: string, placement: Placement, offset = 20) => {
  const { x, y } = parseTransform(transform);

  let offsetX = x;
  let offsetY = y;

  if (placement.startsWith('bottom')) {
    offsetY = y + offset; // Offset downward
  } else if (placement.startsWith('top')) {
    offsetY = y - offset; // Offset upward
  } else if (placement.startsWith('left')) {
    offsetX = x - offset; // Offset leftward
  } else if (placement.startsWith('right')) {
    offsetX = x + offset; // Offset rightward
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
  } = options;

  // Animation state management
  const [animationPhase, setAnimationPhase] = useState<'offset' | 'animating'>('offset');
  const [lastTransform, setLastTransform] = useState('');
  const stableTimerRef = useRef<NodeJS.Timeout>();

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
          ? getOffsetTransform(floatingStyles.transform as string, placement, offset)
          : floatingStyles.transform,
        transition: 'none',
      };
    }

    // Final position, with animation
    return {
      ...floatingStyles,
      transition: `opacity 250ms linear, transform ${animationDuration}ms ${easing}`,
    };
  }, [floatingStyles, placement, animationPhase, offset, animationDuration, easing, enabled]);

  return {
    finalStyles,
    animationPhase: enabled ? animationPhase : 'animating',
    isStable: enabled ? animationPhase === 'animating' : true,
  };
};
