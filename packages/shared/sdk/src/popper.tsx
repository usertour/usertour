import { CSSProperties, forwardRef, useEffect, useRef, useState } from 'react';
import * as ArrowPrimitive from '@usertour-ui/react-arrow';
import { AssetAttributes, Frame, useFrame } from '@usertour-ui/frame';
import { createContext } from '@usertour-ui/react-context';
import { useSize } from '@usertour-ui/react-use-size';
import { CloseIcon, UsertourIcon } from '@usertour-ui/icons';
import { useComposedRefs } from '@usertour-ui/react-compose-refs';
import { detectOverflow, autoUpdate, platform, ReferenceElement } from '@floating-ui/dom';
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
import type { SideObject, Rect, Placement, Middleware } from '@floating-ui/dom';
import { positionModal, getReClippingRect, getViewportRect } from './utils/backdrop';
import { computePositionStyle } from './utils/position';
import { cn } from '@usertour-ui/ui-utils';
import { Align, ProgressBarType, Side } from '@usertour-ui/types';
import { hiddenStyle } from './utils/content';
import { usePopperAnimation } from './hooks';

const POPPER_NAME = 'Popover';

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

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

type BackdropRect = {
  box: React.CSSProperties;
  top: React.CSSProperties;
  bottom: React.CSSProperties;
  left: React.CSSProperties;
  right: React.CSSProperties;
  default: React.CSSProperties;
};

type PopperProps = {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  triggerRef?: React.RefObject<any>;
  zIndex: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
};

type PopperContextProps = {
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  zIndex: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  triggerRef?: React.RefObject<any>;
  viewportRef?: React.RefObject<any>;
  referenceHidden?: boolean;
  setReferenceHidden?: (hidden: boolean) => void;
  rect?: Rect;
  setRect?: (rect: Rect | undefined) => void;
  overflow?: SideObject;
  setOverflow?: (overflow: SideObject | undefined) => void;
};

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const [PopperProvider, usePopperContext] = createContext<PopperContextProps>(POPPER_NAME);

const Popper = forwardRef<HTMLDivElement, PopperProps>((props, _) => {
  const { triggerRef, open = false, children, zIndex, assets, globalStyle } = props;
  const [referenceHidden, setReferenceHidden] = useState(false);
  const [rect, setRect] = useState<Rect>();
  const [overflow, setOverflow] = useState<SideObject>();

  //todo optimzed
  const [, setOpenState] = useState(open);
  const handleOpenChange = (isOpen: boolean) => {
    setOpenState(isOpen);
  };
  useEffect(() => {
    setOpenState(open);
  }, [open]);

  return (
    <>
      <PopperProvider
        onOpenChange={handleOpenChange}
        triggerRef={triggerRef}
        zIndex={zIndex}
        assets={assets}
        globalStyle={globalStyle}
        referenceHidden={referenceHidden}
        setReferenceHidden={setReferenceHidden}
        rect={rect}
        setRect={setRect}
        overflow={overflow}
        setOverflow={setOverflow}
      >
        {open && <PopperContainer>{children}</PopperContainer>}
      </PopperProvider>
    </>
  );
});

const PopperContainer = forwardRef<HTMLDivElement, PopperContentProps>(({ children }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const composedRefs = useComposedRefs(ref, containerRef);
  const { globalStyle } = usePopperContext(POPPER_NAME);
  useEffect(() => {
    if (containerRef.current && globalStyle) {
      containerRef.current.style.cssText = globalStyle;
    }
  }, [containerRef.current, globalStyle]);
  return (
    <>
      <div className="usertour-widget-chrome usertour-widget-root" ref={composedRefs}>
        {children}
      </div>
    </>
  );
});

const PopperContentFrame = forwardRef<HTMLDivElement, PopperContentProps>(({ children }, _) => {
  const { onOpenChange, assets, globalStyle } = usePopperContext(POPPER_NAME);
  return (
    <>
      <Frame assets={assets} className="usertour-widget-popper__frame">
        <PopperContentInFrame onOpenChange={onOpenChange} globalStyle={globalStyle}>
          {children}
        </PopperContentInFrame>
      </Frame>
    </>
  );
});

type PopperOverlayProps = { blockTarget?: boolean; viewportRect?: Rect };
const PopperOverlay = forwardRef<HTMLDivElement, PopperOverlayProps>((props, _) => {
  const { triggerRef, zIndex, referenceHidden, rect, overflow } = usePopperContext(POPPER_NAME);
  const { blockTarget = false, viewportRect } = props;
  const [backdrop, setBackdrop] = useState<BackdropRect | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const referenceEl = triggerRef?.current as Element;
    if (rect && triggerRef && overflow) {
      const clippingRect = getReClippingRect(rect, overflow);
      const viewRect = viewportRect ? viewportRect : getViewportRect();
      const b = positionModal(referenceEl, clippingRect, zIndex, viewRect, 0);
      setBackdrop(b);
    }
  }, [overflow, rect, viewportRect, triggerRef, zIndex]);

  const backdropStyle = {
    ...backdrop?.box,
    ...(referenceHidden
      ? hiddenStyle
      : { opacity: 1, pointerEvents: blockTarget ? undefined : ('none' as const) }),
  };

  return (
    <>
      <div
        className="usertour-widget-popper-backdrop usertour-widget-popper-backdrop--visible"
        style={backdropStyle}
        ref={backdropRef}
      />
      <div
        className="usertour-widget-popper-block usertour-widget-popper-block--top usertour-widget-popper-block--visible"
        style={{ ...backdrop?.top }}
      />
      <div
        className="usertour-widget-popper-block usertour-widget-popper-block--right usertour-widget-popper-block--visible"
        style={backdrop?.right}
      />
      <div
        className="usertour-widget-popper-block usertour-widget-popper-block--bottom usertour-widget-popper-block--visible"
        style={backdrop?.bottom}
      />
      <div
        className="usertour-widget-popper-block usertour-widget-popper-block--left usertour-widget-popper-block--visible"
        style={backdrop?.left}
      />
    </>
  );
});

// Arrow component

const PopperContentPotal = forwardRef<HTMLDivElement, PopperContentProps>((props, forwardedRef) => {
  const {
    children,
    side = 'bottom',
    sideOffset = 0,
    align = 'center',
    alignOffset = 0,
    arrowPadding = 0,
    avoidCollisions = true,
    collisionBoundary = [],
    arrowSize = { width: 20, height: 10 },
    collisionPadding: collisionPaddingProp = 0,
    sticky = 'partial',
    arrowColor = 'white',
    hideWhenDetached = false,
    dir = 'ltr',
    width = 'auto',
    updatePositionStrategy = 'optimized',
  } = props;
  const { triggerRef, zIndex, setReferenceHidden, setRect, setOverflow } =
    usePopperContext(POPPER_NAME);
  const arrowRef = useRef(null);
  const referenceEl = triggerRef?.current as ReferenceElement;
  const arrowRectSize = useSize(arrowRef.current);
  const arrowWidth = arrowRectSize?.width ?? 0;
  const arrowHeight = arrowRectSize?.height ?? 0;
  // const arrowWidth = 40;
  // const arrowHeight = 40;
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
    // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
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
      // Check if reference element is valid (has size and is in viewport)
      const isInvalid =
        width === 0 || height === 0 || (x === 0 && y === 0 && width === 0 && height === 0);
      // Combine original hide logic with custom logic
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

  const { refs, floatingStyles, placement, middlewareData } = useFloating({
    // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
    strategy: 'fixed',
    placement: desiredPlacement,
    whileElementsMounted: (...args) => {
      const cleanup = autoUpdate(...args, {
        animationFrame: updatePositionStrategy === 'always',
      });
      return cleanup;
    },
    elements: {
      reference: referenceEl,
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
      // Custom middleware to set overflow state
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
  const cannotCenterArrow = false;
  const baseSide = OPPOSITE_SIDE[placedSide];

  const popperRef = useRef<HTMLDivElement | null>(null);
  const composedRefs = useComposedRefs(forwardedRef, popperRef, (node: any) =>
    refs.setFloating(node),
  );

  const inlineStyle: React.CSSProperties = {
    ...finalStyles,
    width: width,
    zIndex: zIndex + 1,
    ...(middlewareData.customHide?.referenceHidden ? hiddenStyle : { opacity: 1 }),
  };

  return (
    <>
      <div
        className="usertour-widget-popper usertour-centered usertour-enabled"
        ref={composedRefs}
        data-usertour-popper-content-wrapper=""
        data-usertour-popper-data-placement={placedSide}
        style={inlineStyle}
        // Floating UI interally calculates logical alignment based the `dir` attribute on
        // the reference/floating node, we must add this attribute here to ensure
        // this is calculated when portalled as well as inline.
        dir={dir}
      >
        <div className="usertour-widget-popper-outline usertour-widget-popper-outline--bubble-placement-bottom-left">
          <div className="usertour-widget-popper__frame-wrapper">{children}</div>
        </div>
        <span
          ref={arrowRef}
          style={{
            position: 'absolute',
            left: arrowX,
            top: arrowY,
            [baseSide]: 0,
            transformOrigin: {
              top: '',
              right: '0 0',
              bottom: 'center 0',
              left: '100% 0',
            }[placedSide],
            transform: {
              top: 'translateY(100%)',
              right: 'translateY(50%) rotate(90deg) translateX(-50%)',
              bottom: 'rotate(180deg)',
              left: 'translateY(50%) rotate(-90deg) translateX(50%)',
            }[placedSide],
            ...(cannotCenterArrow || middlewareData.customHide?.referenceHidden
              ? hiddenStyle
              : { opacity: 1 }),
          }}
        >
          <ArrowPrimitive.Root
            width={arrowSize.width}
            height={arrowSize.height}
            style={{
              fill: arrowColor,
              // ensures the element can be measured correctly (mostly for if SVG)
              display: 'block',
            }}
          />
        </span>
      </div>
    </>
  );
});

interface ModalContentProps {
  children?: React.ReactNode;
  width: string;
  position: string;
  enabledBackdrop?: boolean;
  dir?: string;
  positionOffsetX?: number;
  positionOffsetY?: number;
}
const PopperModalContentPotal = forwardRef<HTMLDivElement, ModalContentProps>(
  (props, forwardedRef) => {
    const {
      children,
      dir = 'ltr',
      width = 'auto',
      position = 'center',
      enabledBackdrop = true,
      positionOffsetX = 0,
      positionOffsetY = 0,
    } = props;
    const context = usePopperContext(POPPER_NAME);
    const containerRef = useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, containerRef);

    const style = computePositionStyle(position, positionOffsetX, positionOffsetY);

    return (
      <>
        {enabledBackdrop && (
          <div
            className="usertour-widget-backdrop"
            style={{ position: 'fixed', visibility: 'visible', zIndex: context.zIndex + 1 }}
          />
        )}
        <div
          className="usertour-widget-popper usertour-centered usertour-enabled"
          ref={composedRefs}
          data-usertour-popper-content-wrapper=""
          style={{
            ...style,
            width: width,
            zIndex: context.zIndex + 1,
          }}
          dir={dir}
        >
          <div className="usertour-widget-popper-outline usertour-widget-popper-outline--bubble-placement-bottom-left">
            <div className="usertour-widget-popper__frame-wrapper">{children}</div>
          </div>
        </div>
      </>
    );
  },
);

const PopperContentInFrame = forwardRef<HTMLDivElement, PopperContentProps>((props, _) => {
  const { children, globalStyle } = props;
  const { setStyle, document } = useFrame();
  const onSizeChange = (rect: { width: number; height: number }) => {
    setStyle(`height: ${rect.height}px !important`);
  };
  useEffect(() => {
    if (globalStyle) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle]);
  return (
    <>
      <PopperContent onSizeChange={onSizeChange}>{children}</PopperContent>
    </>
  );
});

const PopperContent = forwardRef<HTMLDivElement, PopperContentProps>((props, _) => {
  const { onSizeChange, children } = props;
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const rect = useSize(ref);

  useEffect(() => {
    if (rect) {
      onSizeChange?.(rect);
    }
  }, [rect]);

  return (
    <>
      <div
        ref={setRef}
        className="usertour-root usertour-widget-popper-frame-root usertour-widget-popper-frame-root-iframe text-sdk-foreground"
      >
        {children}
      </div>
    </>
  );
});

/* -------------------------------------------------------------------------------------------------
 * PopperClose
 * -----------------------------------------------------------------------------------------------*/

const CLOSE_NAME = 'PopperClose';

interface PopoverCloseProps {
  onClick?: () => void;
  className?: string;
}

const PopperClose = forwardRef<HTMLButtonElement, PopoverCloseProps>(
  (props: PopoverCloseProps, forwardedRef) => {
    const { onClick, className } = props;
    const handleOnClick = () => {
      if (onClick) {
        onClick();
      }
    };
    return (
      <button
        type="button"
        className={cn(
          'rounded-full h-[25px] w-[25px] inline-flex items-center justify-center text-sdk-xbutton absolute top-[5px] right-[5px] hover:bg-sdk-primary/40 outline-none cursor-default',
          className,
        )}
        aria-label="Close"
        onClick={handleOnClick}
        ref={forwardedRef}
      >
        <CloseIcon />
      </button>
    );
  },
);

PopperClose.displayName = CLOSE_NAME;

const transformOrigin = (options: {
  arrowWidth: number;
  arrowHeight: number;
}): Middleware => ({
  name: 'transformOrigin',
  options,
  fn(data) {
    const { placement, rects, middlewareData } = data;

    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
    const isArrowHidden = cannotCenterArrow;
    const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
    const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;

    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
    const noArrowAlign = { start: '0%', center: '50%', end: '100%' }[placedAlign];

    const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
    const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;

    let x = '';
    let y = '';

    if (placedSide === 'bottom') {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${-arrowHeight}px`;
    } else if (placedSide === 'top') {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${rects.floating.height + arrowHeight}px`;
    } else if (placedSide === 'right') {
      x = `${-arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    } else if (placedSide === 'left') {
      x = `${rects.floating.width + arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    }
    return { data: { x, y } };
  },
});

function getSideAndAlignFromPlacement(placement: Placement) {
  const [side, align = 'center'] = placement.split('-');
  return [side as Side, align as Align] as const;
}

type PopperStaticContentProps = PopperContentProps & {
  height: string;
  showArrow: boolean;
  className?: string;
  customStyle?: CSSProperties;
};

const PopperStaticContent = forwardRef<HTMLDivElement, PopperStaticContentProps>(
  (props, forwardedRef) => {
    const {
      arrowSize = { width: 20, height: 10 },
      arrowColor = 'white',
      children,
      width = 'auto',
      height = 'auto',
      side = 'bottom',
      showArrow = true,
      customStyle,
      className,
    } = props;

    return (
      <div
        className={cn('usertour-widget-popper usertour-centered usertour-enabled', className)}
        dir="ltr"
        style={customStyle}
        ref={forwardedRef}
      >
        <div
          className="usertour-widget-popper-outline usertour-widget-popper-outline--bubble-placement-bottom-left"
          style={{
            width,
            height,
            overflow: 'scroll',
          }}
        >
          <div className="usertour-widget-popper__frame-wrapper">
            <div className="usertour-root usertour-widget-popper-frame-root usertour-widget-popper-frame-root-iframe text-sdk-foreground">
              {children}
            </div>
          </div>
        </div>
        {showArrow && (
          <span
            style={{
              position: 'absolute',
              left: width ? Number.parseInt(width) / 2 - arrowSize.width / 2 : '50%',
              top: `-${arrowSize.height}px`,
              [OPPOSITE_SIDE[side]]: 0,
              transformOrigin: {
                top: '',
                right: '0 0',
                bottom: 'center 0',
                left: '100% 0',
              }[side],
              transform: {
                top: 'translateY(100%)',
                right: 'translateY(50%) rotate(90deg) translateX(-50%)',
                bottom: 'rotate(180deg)',
                left: 'translateY(50%) rotate(-90deg) translateX(50%)',
              }[side],
              opacity: 1,
            }}
          >
            <ArrowPrimitive.Root
              width={arrowSize.width}
              height={arrowSize.height}
              style={{
                fill: arrowColor,
                // ensures the element can be measured correctly (mostly for if SVG)
                display: 'block',
              }}
            />
          </span>
        )}
      </div>
    );
  },
);

const PopperMadeWith = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <>
      <div ref={ref} className="absolute bottom-2 left-3 text-xs	opacity-50	hover:opacity-75		">
        <a
          href="https://www.usertour.io?utm_source=made-with-usertour&utm_medium=link&utm_campaign=made-with-usertour-widget"
          className="!text-sdk-foreground !no-underline	 flex flex-row space-x-0.5 items-center !font-sans "
          target="_blank"
          rel="noopener noreferrer"
        >
          <UsertourIcon width={14} height={14} />
          <span>Made with Usertour</span>
        </a>
      </div>
    </>
  );
});

interface PopperProgresshProps {
  width?: number;
  type?: ProgressBarType;
  currentStepIndex?: number;
  totalSteps?: number;
  position?: 'top' | 'bottom';
}

const PopperProgressContainer = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
    type?: ProgressBarType;
    position?: 'top' | 'bottom';
  }
>((props, ref) => {
  const { children, className, type, position = 'top' } = props;

  // Get the appropriate CSS variable based on type
  const getProgressHeightVariable = (progressType?: ProgressBarType) => {
    switch (progressType) {
      case ProgressBarType.NARROW:
        return 'var(--usertour-narrow-progress-bar-height)';
      case ProgressBarType.CHAIN_ROUNDED:
        return 'var(--usertour-rounded-progress-bar-height)';
      case ProgressBarType.CHAIN_SQUARED:
        return 'var(--usertour-squared-progress-bar-height)';
      case ProgressBarType.DOTS:
        return 'var(--usertour-dotted-progress-bar-height)';
      case ProgressBarType.NUMBERED:
        return 'var(--usertour-numbered-progress-bar-height)';
      default:
        return 'var(--usertour-progress-bar-height)';
    }
  };

  const progressHeight = getProgressHeightVariable(type);
  const multiplier = type === ProgressBarType.NUMBERED ? 0.5 : 1;

  // Calculate margin values based on position and multiplier
  const marginValue = `calc(${progressHeight} * ${multiplier})`;
  const marginTop = position === 'bottom' ? marginValue : '0';
  const marginBottom = position === 'top' ? marginValue : '0';

  return (
    <div
      className={cn('w-full flex items-center justify-center overflow-hidden', className)}
      ref={ref}
      style={{
        marginTop,
        marginBottom,
      }}
    >
      {children}
    </div>
  );
});
PopperProgressContainer.displayName = 'PopperProgressContainer';

const PopperProgress = forwardRef<HTMLDivElement, PopperProgresshProps>((props, ref) => {
  const {
    type = ProgressBarType.FULL_WIDTH,
    currentStepIndex = 0,
    totalSteps = 1,
    position = 'top',
  } = props;

  // Calculate progress percentage based on currentStepIndex and totalSteps
  // currentStepIndex is 0-based, so we add 1 for display and progress calculation
  const displayStep = currentStepIndex + 1;
  const progressPercentage = totalSteps > 0 ? (displayStep / totalSteps) * 100 : 0;
  const maxItems = totalSteps;

  if (type === ProgressBarType.NARROW) {
    return (
      <>
        <PopperProgressContainer ref={ref} type={type} position={position}>
          <div className="w-[80px] h-sdk-narrow-progress border border-sdk-progress rounded-lg">
            <div
              className="h-full bg-sdk-progress transition-[width] duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </PopperProgressContainer>
      </>
    );
  }
  if (type === ProgressBarType.CHAIN_ROUNDED) {
    return (
      <>
        <PopperProgressContainer ref={ref} type={type} position={position}>
          {Array.from({ length: maxItems }, (_, index) => (
            <div
              key={index}
              className={`h-sdk-rounded-progress w-sdk-rounded-progress rounded-lg border border-sdk-progress transition-colors duration-300 mx-1 ${
                index < displayStep ? 'bg-sdk-progress' : ''
              }`}
            />
          ))}
        </PopperProgressContainer>
      </>
    );
  }
  if (type === ProgressBarType.CHAIN_SQUARED) {
    return (
      <>
        <PopperProgressContainer ref={ref} type={type} position={position}>
          {Array.from({ length: maxItems }, (_, index) => (
            <div
              key={index}
              className={`h-sdk-squared-progress w-sdk-squared-progress border border-sdk-progress transition-colors duration-300 mx-1 ${
                index < displayStep ? 'bg-sdk-progress' : ''
              }`}
            />
          ))}
        </PopperProgressContainer>
      </>
    );
  }

  if (type === ProgressBarType.DOTS) {
    return (
      <>
        <PopperProgressContainer ref={ref} type={type} position={position}>
          {Array.from({ length: maxItems }, (_, index) => (
            <div
              key={index}
              className={`h-sdk-dotted-progress w-sdk-dotted-progress border border-sdk-progress rounded-full transition-colors duration-300 mx-0.5 ${
                index < displayStep ? 'bg-sdk-progress' : ''
              }`}
            />
          ))}
        </PopperProgressContainer>
      </>
    );
  }

  if (type === ProgressBarType.NUMBERED) {
    return (
      <>
        <PopperProgressContainer ref={ref} type={type} position={position}>
          <span className="text-sdk-numbered-progress text-sdk-progress font-bold">
            {displayStep} of {totalSteps}
          </span>
        </PopperProgressContainer>
      </>
    );
  }

  return (
    <>
      <div className="h-2.5" />
      <div
        ref={ref}
        className="absolute top-0 left-0 right-0 overflow-hidden "
        style={{ height: 'var(--usertour-progress-bar-height)' }}
      >
        <div
          className="h-full bg-sdk-progress transition-[width] duration-200"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </>
  );
});

export {
  Popper,
  PopperOverlay,
  PopperClose,
  PopperMadeWith,
  PopperProgress,
  PopperContentFrame,
  PopperContent,
  PopperModalContentPotal,
  PopperContentPotal,
  PopperStaticContent,
};

export type { PopperProps, PopperContentProps, ModalContentProps };
