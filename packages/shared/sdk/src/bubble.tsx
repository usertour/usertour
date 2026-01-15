import { CSSProperties, forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { cn } from '@usertour-packages/tailwind';
import { Frame, useFrame } from '@usertour-packages/frame';
import { computePositionStyle } from './utils/position';
import { usePopperContext } from './popper-context';

/* -------------------------------------------------------------------------------------------------
 * Type Definitions
 * -----------------------------------------------------------------------------------------------*/

type NotchVerticalPosition = 'top' | 'bottom';
type NotchHorizontalPosition = 'left' | 'right';

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
  /** Whether to apply absolute positioning (default: true) */
  applyPosition?: boolean;
}

type PopperBubbleAvatarWrapperProps = PopperBubbleAvatarProps;

/* -------------------------------------------------------------------------------------------------
 * useAnchorPosition Hook
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * PopperBubblePortal
 * -----------------------------------------------------------------------------------------------*/

/**
 * Bubble Portal component with optional avatar notch
 * Similar to PopperModalContentPotal but without backdrop
 */
const BUBBLE_NAME = 'PopperBubblePortal';

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

    // Get zIndex from Popper context
    const { zIndex } = usePopperContext(BUBBLE_NAME);

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
          zIndex: zIndex,
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
        </div>
        <PopperBubbleAvatarWrapper
          src={avatarSrc}
          size={avatarSize}
          vertical={vertical}
          horizontal={horizontal}
          minimizable={false}
          onClick={() => {}}
        />
      </div>
    );
  },
);

PopperBubblePortal.displayName = 'PopperBubblePortal';

/* -------------------------------------------------------------------------------------------------
 * PopperAvatarNotch
 * -----------------------------------------------------------------------------------------------*/

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
  // Note: Set all four border properties explicitly to avoid mixing shorthand (borderColor)
  // with specific properties (borderTopColor, etc.) which causes React rerender warnings
  const borderStyle: CSSProperties = {
    borderStyle: 'solid',
    // Set all four border widths explicitly
    borderTopWidth: vertical === 'bottom' ? size : 0,
    borderBottomWidth: vertical === 'top' ? size : 0,
    borderLeftWidth: horizontal === 'right' ? size : 0,
    borderRightWidth: horizontal === 'left' ? size : 0,
    // Set all four border colors explicitly to avoid shorthand/specific property conflicts
    borderTopColor: vertical === 'bottom' ? color : 'transparent',
    borderBottomColor: vertical === 'top' ? color : 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
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
    applyPosition = true,
  } = props;

  const handleClick = useCallback(() => {
    if (minimizable && onClick) {
      onClick();
    }
  }, [minimizable, onClick]);

  // Calculate position styles based on vertical and horizontal props
  // When applyPosition is false, only apply size (used inside iframe)
  const positionStyle: CSSProperties = applyPosition
    ? {
        width: size,
        height: size,
        position: 'absolute',
        // Horizontal position
        ...(horizontal === 'left' ? { left: 0 } : { right: 0 }),
        // Vertical position
        ...(vertical === 'bottom' ? { bottom: 0 } : { top: 0 }),
      }
    : {
        width: size,
        height: size,
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

/* -------------------------------------------------------------------------------------------------
 * PopperBubbleAvatarInFrame
 * -----------------------------------------------------------------------------------------------*/

interface PopperBubbleAvatarInFrameProps extends Omit<PopperBubbleAvatarProps, 'applyPosition'> {
  globalStyle?: string;
}

/**
 * Avatar component rendered inside an iframe
 * Applies global styles to the iframe document body
 */
const PopperBubbleAvatarInFrame = (props: PopperBubbleAvatarInFrameProps) => {
  const { globalStyle, ...avatarProps } = props;
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return <PopperBubbleAvatar {...avatarProps} applyPosition={false} />;
};

/* -------------------------------------------------------------------------------------------------
 * PopperBubbleAvatarWrapper
 * -----------------------------------------------------------------------------------------------*/

/**
 * Wrapper component for PopperBubbleAvatar that handles iframe mode
 * When isIframeMode is true, wraps the avatar in a Frame component with positioning on the Frame
 * When isIframeMode is false, renders PopperBubbleAvatar directly with its own positioning
 */
const PopperBubbleAvatarWrapper = (props: PopperBubbleAvatarWrapperProps) => {
  const {
    size = 48,
    vertical = 'bottom',
    horizontal = 'left',
    src,
    alt,
    minimizable,
    onClick,
    className,
  } = props;

  // Get shared data from Popper context
  const { isIframeMode, assets, globalStyle } = usePopperContext(BUBBLE_NAME);

  // Position style for the Frame container (used in iframe mode)
  const framePositionStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'absolute',
    ...(horizontal === 'left' ? { left: 0 } : { right: 0 }),
    ...(vertical === 'bottom' ? { bottom: 0 } : { top: 0 }),
    border: 'none',
  };

  if (isIframeMode) {
    return (
      <Frame
        assets={assets}
        className="usertour-widget-bubble__avatar"
        defaultStyle={framePositionStyle}
      >
        <PopperBubbleAvatarInFrame
          src={src}
          alt={alt}
          size={size}
          vertical={vertical}
          horizontal={horizontal}
          minimizable={minimizable}
          onClick={onClick}
          className={className}
          globalStyle={globalStyle}
        />
      </Frame>
    );
  }

  return (
    <PopperBubbleAvatar
      src={src}
      alt={alt}
      size={size}
      vertical={vertical}
      horizontal={horizontal}
      minimizable={minimizable}
      onClick={onClick}
      className={className}
      applyPosition={true}
    />
  );
};

export {
  PopperBubblePortal,
  PopperBubbleAvatar,
  PopperBubbleAvatarWrapper,
  PopperAvatarNotch,
  useAnchorPosition,
};

export type {
  PopperBubblePortalProps,
  PopperBubbleAvatarProps,
  PopperBubbleAvatarWrapperProps,
  PopperAvatarNotchProps,
  NotchVerticalPosition,
  NotchHorizontalPosition,
};
