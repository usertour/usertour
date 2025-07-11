import { useRef, useEffect } from 'react';
import { useSize } from '@usertour-ui/react-use-size';
import { detectOverflow, platform, ReferenceElement, autoUpdate } from '@floating-ui/dom';
import {
  useFloating,
  offset,
  shift,
  limitShift,
  hide,
  arrow as floatingUIarrow,
  flip,
  size,
} from '@floating-ui/react-dom';
import type { Rect, Placement, Middleware, SideObject } from '@floating-ui/dom';
import { getSideAndAlignFromPlacement, transformOrigin } from '../utils/position';
import { hiddenStyle } from '../utils/content';
import { usePopperAnimation } from './use-popper-animation';
import { Align, Side } from '@usertour-ui/types';
import { useComposedRefs } from '@usertour-ui/react-compose-refs';

type Boundary = Element | null;

interface PopperContentProps {
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  width?: string;
  side?: Side;
  sideOffset?: number;
  align?: Align;
  alignOffset?: number;
  arrowPadding?: number;
  avoidCollisions?: boolean;
  arrowColor?: string;
  arrowSize?: { width: number; height: number };
  collisionBoundary?: Boundary | Boundary[];
  collisionPadding?: number | Partial<Record<Side, number>>;
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
  dir?: string;
  globalStyle?: string;
  updatePositionStrategy?: 'optimized' | 'always';
  onPlaced?: () => void;
}

interface PopperContext {
  triggerRef: React.RefObject<any>;
  zIndex: number;
  setReferenceHidden: (hidden: boolean) => void;
  setRect: (rect: Rect | undefined) => void;
  setOverflow: (overflow: SideObject | undefined) => void;
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

// Custom hook that extracts all the logic from PopperContentPotal
export const usePopperContent = (
  props: PopperContentProps,
  context: PopperContext,
  enabled = true,
) => {
  const {
    side = 'bottom',
    sideOffset = 0,
    align = 'center',
    alignOffset = 0,
    arrowPadding = 0,
    avoidCollisions = true,
    collisionBoundary = [],
    collisionPadding: collisionPaddingProp = 0,
    sticky = 'partial',
    hideWhenDetached = false,
    width = 'auto',
    updatePositionStrategy = 'optimized',
  } = props;

  const { triggerRef, zIndex, setReferenceHidden, setRect, setOverflow } = context;

  const arrowRef = useRef(null);
  const referenceEl = triggerRef?.current as ReferenceElement;
  const arrowRectSize = useSize(arrowRef.current);
  const arrowWidth = arrowRectSize?.width ?? 0;
  const arrowHeight = arrowRectSize?.height ?? 0;
  const desiredPlacement = `${side}${align !== 'center' ? `-${align}` : ''}` as Placement;
  const collisionPadding =
    typeof collisionPaddingProp === 'number'
      ? collisionPaddingProp
      : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp };

  const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
  const hasExplicitBoundaries = boundary.length > 0;

  const detectOverflowOptions = {
    padding: collisionPadding,
    boundary: boundary.filter(isNotNull),
    altBoundary: hasExplicitBoundaries,
  };

  // Custom middleware that extends the original hide logic
  const customHideMiddleware = (options: {
    strategy?: 'referenceHidden' | 'escaped';
    padding?: number | Partial<Record<Side, number>>;
    boundary?: Boundary | Boundary[];
  }): Middleware => ({
    name: 'customHide',
    options,
    async fn(state) {
      const { rects } = state;
      const originalHide = hide({ strategy: 'referenceHidden', ...detectOverflowOptions });
      const originalResult = await originalHide.fn(state);
      const { width, height, x, y } = rects.reference;
      const isInvalid =
        width === 0 || height === 0 || (x === 0 && y === 0 && width === 0 && height === 0);
      const referenceHidden = originalResult.data?.referenceHidden || isInvalid;
      const escaped = originalResult.data?.escaped || false;

      return {
        data: {
          referenceHidden,
          escaped,
        },
      };
    },
  });

  // Only execute useFloating when enabled
  const { refs, floatingStyles, placement, middlewareData } = useFloating({
    strategy: 'fixed',
    placement: desiredPlacement,
    whileElementsMounted: (...args) => {
      const cleanup = autoUpdate(...args, {
        animationFrame: updatePositionStrategy === 'always',
      });
      return cleanup;
    },
    elements: {
      reference: enabled ? referenceEl : null,
    },
    platform: {
      ...platform,
      convertOffsetParentRelativeRectToViewportRelativeRect(...args) {
        const rect = platform.convertOffsetParentRelativeRectToViewportRelativeRect(
          ...args,
        ) as Rect;
        setRect?.(rect);
        return rect;
      },
    },
    middleware: [
      offset({
        mainAxis: sideOffset + arrowHeight,
        alignmentAxis: alignOffset,
      }),
      avoidCollisions &&
        shift({
          mainAxis: true,
          crossAxis: false,
          limiter: sticky === 'partial' ? limitShift() : undefined,
          ...detectOverflowOptions,
        }),
      avoidCollisions && flip({ ...detectOverflowOptions }),
      size({
        ...detectOverflowOptions,
      }),
      arrowRef && floatingUIarrow({ element: arrowRef, padding: arrowPadding }),
      transformOrigin({ arrowWidth, arrowHeight }),
      hideWhenDetached &&
        customHideMiddleware({
          strategy: 'referenceHidden',
          padding: detectOverflowOptions.padding,
          boundary: detectOverflowOptions.boundary,
        }),
      {
        name: 'overflowState',
        async fn(state) {
          if (setOverflow) {
            const overflow = await detectOverflow(state, {
              elementContext: 'reference',
            });
            setOverflow(overflow);
          }
          return {};
        },
      },
    ],
  });

  // Use the animation hook
  const { finalStyles } = usePopperAnimation(floatingStyles, placement, {
    stableThreshold: 250,
    offset: 20,
    animationDuration: 500,
  });

  const [placedSide] = getSideAndAlignFromPlacement(placement);
  useEffect(() => {
    setReferenceHidden?.(middlewareData.customHide?.referenceHidden ?? false);
  }, [middlewareData.customHide?.referenceHidden]);

  const arrowX = middlewareData.arrow?.x;
  const arrowY = middlewareData.arrow?.y;
  const baseSide = OPPOSITE_SIDE[placedSide];

  const composedRefs = useComposedRefs((node: any) => refs.setFloating(node));

  const inlineStyle: React.CSSProperties = {
    ...finalStyles,
    width: width,
    zIndex: zIndex + 1,
    ...(middlewareData.customHide?.referenceHidden ? hiddenStyle : { opacity: 1 }),
  };

  return {
    arrowRef,
    composedRefs,
    inlineStyle,
    placedSide,
    arrowX,
    arrowY,
    baseSide,
    middlewareData,
  };
};
