import { cn } from '@usertour-packages/tailwind';
import {
  CSSProperties,
  RefCallback,
  forwardRef,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMeasure } from 'react-use';

// Constants for scaled preview
const INITIAL_SCALE = 0.01;
const MAX_SCALE = 1;

/**
 * Calculate the appropriate scale factor to fit content within max dimensions
 * Returns null if dimensions are invalid
 */
const calculateScale = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): number | null => {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const widthScale = maxWidth / width;
  const heightScale = maxHeight / height;
  const newScale = Math.min(widthScale, heightScale, MAX_SCALE);

  return Number.isFinite(newScale) && newScale > 0 ? newScale : null;
};

interface UseScaledPreviewOptions {
  maxWidth: number;
  maxHeight: number;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

interface UseScaledPreviewResult {
  scale: number;
  contentRef: RefCallback<HTMLDivElement>;
  containerStyle: CSSProperties;
}

/**
 * Custom hook for calculating and managing scaled preview state
 * Uses ResizeObserver to measure original (unscaled) content dimensions
 */
const useScaledPreview = ({
  maxWidth,
  maxHeight,
  onContentRectChange,
}: UseScaledPreviewOptions): UseScaledPreviewResult => {
  const [scale, setScale] = useState<number>(INITIAL_SCALE);
  const [contentRef, contentRect] = useMeasure<HTMLDivElement>();
  const prevScaleRef = useRef<number>(INITIAL_SCALE);

  // Calculate and update scale when content dimensions change
  useLayoutEffect(() => {
    if (!contentRect) return;

    // contentRect contains original (unscaled) dimensions because:
    // 1. useMeasure uses ResizeObserver which measures layout dimensions
    // 2. Scale transform is applied to outer container, not the measured element
    const newScale = calculateScale(
      contentRect.width ?? 0,
      contentRect.height ?? 0,
      maxWidth,
      maxHeight,
    );

    if (newScale !== null && newScale !== prevScaleRef.current) {
      prevScaleRef.current = newScale;
      setScale(newScale);
    }
  }, [contentRect, maxWidth, maxHeight]);

  // Notify parent of rect/scale changes
  useLayoutEffect(() => {
    if (onContentRectChange && contentRect) {
      onContentRectChange(contentRect as DOMRect, scale);
    }
  }, [contentRect, scale, onContentRectChange]);

  // Memoize container style
  const containerStyle = useMemo<CSSProperties>(
    () => ({
      scale: `${scale}`,
    }),
    [scale],
  );

  return {
    scale,
    contentRef,
    containerStyle,
  };
};

interface ScaledPreviewContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

/**
 * Container component that scales its children to fit within specified max dimensions
 * Uses smooth transition animation when scale changes
 */
const ScaledPreviewContainer = memo(
  forwardRef<HTMLDivElement, ScaledPreviewContainerProps>(
    (
      {
        children,
        maxWidth = 300,
        maxHeight = 160,
        className = 'origin-[center_center]',
        onContentRectChange,
      },
      ref,
    ) => {
      const handleContentRectChange = useCallback(
        (contentRect: DOMRect, scale: number) => {
          onContentRectChange?.(contentRect, scale);
        },
        [onContentRectChange],
      );

      const { contentRef, containerStyle } = useScaledPreview({
        maxWidth,
        maxHeight,
        onContentRectChange: handleContentRectChange,
      });

      return (
        <div
          ref={ref}
          style={containerStyle}
          className={cn('[&_iframe]:pointer-events-none', className)}
        >
          <div ref={contentRef}>{children}</div>
        </div>
      );
    },
  ),
);

ScaledPreviewContainer.displayName = 'ScaledPreviewContainer';

export { ScaledPreviewContainer, useScaledPreview, calculateScale };
export type { ScaledPreviewContainerProps, UseScaledPreviewOptions, UseScaledPreviewResult };
