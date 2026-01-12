import {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as ArrowPrimitive from '@usertour-packages/react-arrow';
import { AssetAttributes, Frame, useFrame } from '@usertour-packages/frame';
import { createContext } from '@usertour-packages/react-context';
import { useSize } from '@usertour-packages/react-use-size';
import { CloseIcon, UsertourIcon } from '@usertour-packages/icons';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { Button } from '@usertour-packages/button';
import type { SideObject, Rect } from '@floating-ui/dom';
import { positionModal, getReClippingRect, getViewportRect } from './utils/backdrop';
import { computePositionStyle } from './utils/position';
import { cn } from '@usertour-packages/tailwind';
import { Align, ProgressBarType, Side } from '@usertour/types';
import { hiddenStyle } from './utils/content';
import { usePopperContent } from './hooks/use-popper-content';

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
  // Whether to use iframe mode, default false
  isIframeMode?: boolean;
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
  // Iframe related states
  isIframeMode?: boolean;
  isIframeLoaded?: boolean;
  setIsIframeLoaded?: (loaded: boolean) => void;
  shouldShow?: boolean;
};

const [PopperProvider, usePopperContext] = createContext<PopperContextProps>(POPPER_NAME);

const Popper = forwardRef<HTMLDivElement, PopperProps>((props, _) => {
  const {
    triggerRef,
    open = false,
    children,
    zIndex,
    assets,
    globalStyle,
    isIframeMode = false,
    onOpenChange,
  } = props;
  const [referenceHidden, setReferenceHidden] = useState(false);
  const [rect, setRect] = useState<Rect>();
  const [overflow, setOverflow] = useState<SideObject>();
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Show condition: direct display for non-iframe mode, wait for loading in iframe mode
  const shouldShow = open && (isIframeMode ? isIframeLoaded : true);

  return (
    <>
      <PopperProvider
        onOpenChange={onOpenChange}
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
        isIframeMode={isIframeMode}
        isIframeLoaded={isIframeLoaded}
        setIsIframeLoaded={setIsIframeLoaded}
        shouldShow={shouldShow}
      >
        {open && <PopperContainer>{children}</PopperContainer>}
      </PopperProvider>
    </>
  );
});

const PopperContainer = forwardRef<HTMLDivElement, PopperContentProps>(({ children }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const composedRefs = useComposedRefs(ref, containerRef);
  const { globalStyle, isIframeMode, shouldShow } = usePopperContext(POPPER_NAME);

  useEffect(() => {
    if (containerRef.current && globalStyle) {
      let finalStyle = globalStyle;

      // Only add loading state styles in iframe mode
      if (isIframeMode) {
        const loadingStyle = `opacity: ${shouldShow ? 1 : 0}; visibility: ${shouldShow ? 'visible' : 'hidden'};`;
        finalStyle = `${globalStyle}; ${loadingStyle}`;
      }

      containerRef.current.style.cssText = finalStyle;
    }
  }, [containerRef.current, globalStyle, isIframeMode, shouldShow]);

  return (
    <div className="usertour-widget-chrome usertour-widget-root" ref={composedRefs}>
      {children}
    </div>
  );
});

const PopperContentFrame = forwardRef<HTMLDivElement, PopperContentProps>(({ children }, _) => {
  const { onOpenChange, assets, globalStyle, setIsIframeLoaded } = usePopperContext(POPPER_NAME);

  const handleFrameLoad = useCallback(() => {
    setIsIframeLoaded?.(true);
  }, [setIsIframeLoaded]);

  return (
    <>
      <Frame assets={assets} className="usertour-widget-popper__frame" onLoad={handleFrameLoad}>
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

const PopperContentPotal = forwardRef<HTMLDivElement, PopperContentProps>((props, forwardedRef) => {
  const {
    children,
    arrowSize = { width: 20, height: 10 },
    arrowColor = 'white',
    dir = 'ltr',
  } = props;

  const { shouldShow, triggerRef, zIndex, setReferenceHidden, setRect, setOverflow } =
    usePopperContext(POPPER_NAME);

  const popperData = usePopperContent(
    props,
    {
      triggerRef: triggerRef!,
      zIndex,
      setReferenceHidden: setReferenceHidden!,
      setRect: setRect!,
      setOverflow: setOverflow!,
    },
    shouldShow,
  );

  const {
    arrowRef,
    composedRefs,
    inlineStyle,
    placedSide,
    arrowX,
    arrowY,
    baseSide,
    middlewareData,
  } = popperData;

  // Combine refs
  const finalComposedRefs = useComposedRefs(forwardedRef, composedRefs);

  return (
    <>
      <div
        className="usertour-widget-popper usertour-centered usertour-enabled"
        ref={finalComposedRefs}
        data-usertour-popper-content-wrapper=""
        data-usertour-popper-data-placement={placedSide}
        style={inlineStyle}
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
            }[placedSide] as string,
            ...(middlewareData.customHide?.referenceHidden ? hiddenStyle : { opacity: 1 }),
          }}
        >
          <ArrowPrimitive.Root
            width={arrowSize.width}
            height={arrowSize.height}
            style={{
              fill: arrowColor,
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
            style={{ position: 'fixed', visibility: 'visible', zIndex: context.zIndex }}
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
    const buttonClassName = cn(
      'size-6 rounded',
      'inline-flex items-center justify-center',
      'text-sdk-xbutton',
      'fixed top-2 right-2',
      'hover:bg-sdk-hover',
      'outline-none cursor-pointer z-50',
      className,
    );

    return (
      <Button
        type="button"
        variant="custom"
        className={buttonClassName}
        aria-label="Close"
        forSdk
        onClick={handleOnClick}
        ref={forwardedRef}
      >
        <CloseIcon />
      </Button>
    );
  },
);

PopperClose.displayName = CLOSE_NAME;

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
            overflow: 'hidden',
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
      <div className="h-4">
        <div
          ref={ref}
          className="absolute bottom-2 left-3 text-xs	opacity-50	hover:opacity-75		"
        >
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

  // Calculate transform values based on position and multiplier
  // Use transform for positioning (better performance, GPU-accelerated)
  const transform =
    position === 'top'
      ? `translateY(calc(${progressHeight} * ${multiplier} * -1))`
      : `translateY(calc(${progressHeight} * ${multiplier}))`;

  return (
    <>
      <div
        className={cn('w-full flex items-center justify-center overflow-hidden', className)}
        ref={ref}
        style={{
          transform,
        }}
      >
        {children}
      </div>
      {position === 'top' && type !== ProgressBarType.NUMBERED && <div className="h-[10px]" />}
    </>
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
      <PopperProgressContainer ref={ref} type={type} position={position}>
        <div className="w-[80px] h-sdk-narrow-progress border border-sdk-progress rounded-lg">
          <div
            className="h-full bg-sdk-progress transition-[width] duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </PopperProgressContainer>
    );
  }
  if (type === ProgressBarType.CHAIN_ROUNDED) {
    return (
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
    );
  }
  if (type === ProgressBarType.CHAIN_SQUARED) {
    return (
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
    );
  }

  if (type === ProgressBarType.DOTS) {
    return (
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
    );
  }

  if (type === ProgressBarType.NUMBERED) {
    return (
      <PopperProgressContainer ref={ref} type={type} position={position}>
        <span className="text-sdk-numbered-progress text-sdk-progress font-bold leading-none">
          {displayStep} of {totalSteps}
        </span>
      </PopperProgressContainer>
    );
  }

  return (
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
  );
});

/* -------------------------------------------------------------------------------------------------
 * PopperBubblePortal
 * -----------------------------------------------------------------------------------------------*/

type NotchVerticalPosition = 'top' | 'bottom';
type NotchHorizontalPosition = 'left' | 'right';

/**
 * Hook to derive anchor position for bubble internal elements (notch, avatar)
 * based on bubble placement on screen
 * @param placement - Bubble placement position
 * @returns Memoized anchor position { vertical, horizontal }
 */
const useAnchorPosition = (placement: string) => {
  return useMemo<{ vertical: NotchVerticalPosition; horizontal: NotchHorizontalPosition }>(() => {
    switch (placement) {
      case 'leftTop':
      case 'centerTop':
        return { vertical: 'top', horizontal: 'left' };
      case 'leftBottom':
      case 'centerBottom':
        return { vertical: 'bottom', horizontal: 'left' };
      case 'rightTop':
        return { vertical: 'top', horizontal: 'right' };
      case 'rightBottom':
        return { vertical: 'bottom', horizontal: 'right' };
      default:
        // Handles 'center' and other unknown positions
        return { vertical: 'bottom', horizontal: 'left' };
    }
  }, [placement]);
};

interface PopperBubblePortalProps {
  children?: React.ReactNode;
  /** Bubble width */
  width?: string;
  /** Bubble position on screen */
  position?: string;
  /** Text direction */
  dir?: string;
  /** Horizontal position offset */
  positionOffsetX?: number;
  /** Vertical position offset */
  positionOffsetY?: number;
  /** Notch color */
  notchColor?: string;
  /** Notch size in pixels */
  notchSize?: number;
  /** Avatar size in pixels, also determines notch horizontal offset */
  avatarSize?: number;
  /** Avatar image source URL */
  avatarSrc?: string;
  /** Additional className */
  className?: string;
}

/**
 * Bubble Portal component with optional avatar notch
 * Similar to PopperModalContentPotal but without backdrop
 */
const PopperBubblePortal = forwardRef<HTMLDivElement, PopperBubblePortalProps>(
  (props, forwardedRef) => {
    const {
      children,
      dir = 'ltr',
      width = 'auto',
      position = 'center',
      positionOffsetX = 0,
      positionOffsetY = 0,
      notchColor = 'white',
      notchSize = 20,
      avatarSize = 60,
      avatarSrc = '',
      className,
    } = props;

    const context = usePopperContext(POPPER_NAME);
    const containerRef = useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, containerRef);

    const style = computePositionStyle(position, positionOffsetX, positionOffsetY);

    // Derive anchor position for internal elements (notch, avatar) from bubble placement
    const { vertical, horizontal } = useAnchorPosition(position);

    // Calculate padding for avatar and notch space
    const avatarSpacePadding = avatarSize + notchSize;
    const outlineStyle =
      vertical === 'bottom'
        ? { paddingBottom: avatarSpacePadding }
        : { paddingTop: avatarSpacePadding };

    return (
      <div
        className={cn('usertour-widget-popper usertour-centered usertour-enabled', className)}
        ref={composedRefs}
        data-usertour-popper-content-wrapper=""
        style={{
          ...style,
          width: width,
          zIndex: context.zIndex + 1,
        }}
        dir={dir}
      >
        <div
          className="usertour-widget-popper-outline usertour-widget-popper-outline--bubble-placement-bottom-left relative"
          style={outlineStyle}
        >
          <div className="usertour-widget-popper__frame-wrapper">{children}</div>
          <PopperAvatarNotch
            vertical={vertical}
            horizontal={horizontal}
            color={notchColor}
            size={notchSize}
            offsetX={avatarSize}
            offsetY={avatarSize}
          />
          <PopperBubbleAvatar
            src={avatarSrc}
            size={avatarSize}
            vertical={vertical}
            horizontal={horizontal}
            minimizable={false}
            onClick={() => {}}
          />
        </div>
      </div>
    );
  },
);

PopperBubblePortal.displayName = 'PopperBubblePortal';

/* -------------------------------------------------------------------------------------------------
 * PopperAvatarNotch
 * -----------------------------------------------------------------------------------------------*/

interface PopperAvatarNotchProps {
  /** Vertical position of the notch: 'top' or 'bottom' */
  vertical?: NotchVerticalPosition;
  /** Horizontal position of the notch: 'left' or 'right' */
  horizontal?: NotchHorizontalPosition;
  /** Notch color, supports CSS color values or CSS variables */
  color?: string;
  /** Notch size in pixels (border width) */
  size?: number;
  /** Horizontal offset position in pixels */
  offsetX?: number;
  /** Vertical offset position in pixels */
  offsetY?: number;
  /** Additional className */
  className?: string;
}

/**
 * Avatar notch component for bubbles
 * Creates a triangular notch that points toward the avatar position
 *
 * Visual examples:
 * - Bottom + Left: Sharp angle points to bottom-left (avatar below-left)
 * - Bottom + Right: Sharp angle points to bottom-right (avatar below-right)
 * - Top + Left: Sharp angle points to top-left (avatar above-left)
 * - Top + Right: Sharp angle points to top-right (avatar above-right)
 */
const PopperAvatarNotch = forwardRef<HTMLDivElement, PopperAvatarNotchProps>((props, ref) => {
  const {
    vertical = 'bottom',
    horizontal = 'left',
    color = 'white',
    size = 20,
    offsetX = 60,
    offsetY = 60,
    className,
  } = props;

  // Calculate position styles
  const positionStyle: CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    // Horizontal position
    ...(horizontal === 'left' ? { left: offsetX } : { right: offsetX }),
    // Vertical position: offset from edge to align with avatar
    ...(vertical === 'bottom' ? { bottom: offsetY } : { top: offsetY }),
  };

  // Build border styles based on position
  // The sharp angle always points toward the avatar
  // CSS triangle: colored border creates the visible edge, transparent border creates the angle
  const borderStyle: CSSProperties = {
    borderStyle: 'solid',
    borderWidth: size,
    borderColor: 'transparent',
    // Color the opposite side to create triangle pointing toward avatar
    // Also remove the border on the same side as the avatar (vertical)
    ...(vertical === 'bottom'
      ? { borderTopColor: color, borderBottomWidth: 0 }
      : { borderBottomColor: color, borderTopWidth: 0 }),
    // Remove border on the horizontal side to create right-angle triangle
    ...(horizontal === 'left' ? { borderLeftWidth: 0 } : { borderRightWidth: 0 }),
  };

  return (
    <div
      ref={ref}
      className={cn('pointer-events-none', className)}
      style={{
        ...positionStyle,
        ...borderStyle,
      }}
      aria-hidden="true"
    />
  );
});

PopperAvatarNotch.displayName = 'PopperAvatarNotch';

/* -------------------------------------------------------------------------------------------------
 * PopperBubbleAvatar
 * -----------------------------------------------------------------------------------------------*/

interface PopperBubbleAvatarProps {
  /** Avatar image source URL */
  src: string;
  /** Image alt text */
  alt?: string;
  /** Avatar size in pixels */
  size?: number;
  /** Vertical position of the avatar: 'top' or 'bottom' */
  vertical?: NotchVerticalPosition;
  /** Horizontal position of the avatar: 'left' or 'right' */
  horizontal?: NotchHorizontalPosition;
  /** Whether the avatar is clickable (minimizable) */
  minimizable?: boolean;
  /** Click handler for minimizable avatar */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Avatar component for Bubble Portal
 * Displays a circular avatar image with optional click functionality
 */
const PopperBubbleAvatar = forwardRef<HTMLDivElement, PopperBubbleAvatarProps>((props, ref) => {
  const {
    src,
    alt = '',
    size = 48,
    vertical = 'bottom',
    horizontal = 'left',
    minimizable = false,
    onClick,
    className,
  } = props;

  const handleClick = useCallback(() => {
    if (minimizable && onClick) {
      onClick();
    }
  }, [minimizable, onClick]);

  // Calculate position styles based on vertical and horizontal props
  const positionStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'absolute',
    // Horizontal position
    ...(horizontal === 'left' ? { left: 0 } : { right: 0 }),
    // Vertical position
    ...(vertical === 'bottom' ? { bottom: 0 } : { top: 0 }),
  };

  return (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden rounded-full bg-sdk-background',
        minimizable && 'cursor-pointer',
        className,
      )}
      style={positionStyle}
      onClick={handleClick}
      role={minimizable ? 'button' : undefined}
      tabIndex={minimizable ? 0 : undefined}
      onKeyDown={
        minimizable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
              }
            }
          : undefined
      }
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
});

PopperBubbleAvatar.displayName = 'PopperBubbleAvatar';

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
  PopperBubblePortal,
  PopperBubbleAvatar,
  PopperAvatarNotch,
};

export type {
  PopperProps,
  PopperContentProps,
  ModalContentProps,
  PopperBubblePortalProps,
  PopperBubbleAvatarProps,
  PopperAvatarNotchProps,
  NotchVerticalPosition,
  NotchHorizontalPosition,
};
