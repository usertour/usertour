import type { AssetAttributes } from '@usertour/frame';
import { Frame, useFrame } from '@usertour/frame';
import { useSize } from '@usertour/react-use-size';
import { RiCloseLargeFill } from '@usertour/icons';
import type { BannerAnimationTiming, BannerData, ThemeTypesSetting } from '@usertour/types';
import { BannerEmbedPlacement } from '@usertour/types';
import type { CSSProperties } from 'react';
import {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useComposedRefs } from '@usertour/react-compose-refs';

import { Button } from '../primitives';
import { useSettingsStyles } from './hooks/use-settings-styles';
import { cn } from '@usertour/tailwind';
import { WidgetAnimation } from './class-names';

const BANNER_DEFAULT_HEIGHT_PX = 56;
const BANNER_DEFAULT_ANIMATION_DURATION_MS = 320;
const BANNER_DEFAULT_ANIMATION_TIMING: BannerAnimationTiming = 'smooth';

const BANNER_ANIMATION_TIMING_PRESETS: Record<BannerAnimationTiming, string> = {
  smooth: 'cubic-bezier(0.42, 0, 0.58, 1)',
  snappy: 'cubic-bezier(0.22, 1, 0.36, 1)',
  gentle: 'cubic-bezier(0, 0, 0.58, 1)',
  linear: 'linear',
};

interface BannerRootContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: BannerData;
  zIndex?: number;
  assets?: AssetAttributes[];
  onDismiss?: () => void;
  /**
   * Live-measured banner height (content + padding), reported from inside the
   * frame. null until the first measurement — the wrapper falls back to the
   * stored data.height (a builder-era snapshot; API-authored banners have
   * none) and, when the reveal animation is on, stays hidden so the animation
   * only ever runs against the real height.
   */
  measuredHeight: number | null;
  onContentSizeChange?: (rect: { width: number; height: number }) => void;
}

const BannerRootContext = createContext<BannerRootContextValue | null>(null);

const useBannerRootContext = () => {
  const context = useContext(BannerRootContext);
  if (!context) {
    throw new Error('useBannerRootContext must be used within a BannerRoot.');
  }
  return context;
};

/** Returns Banner context when inside BannerRoot, null otherwise. Use for optional Banner-aware behavior (e.g. CTA button variants). */
const useOptionalBannerRootContext = (): BannerRootContextValue | null => {
  return useContext(BannerRootContext);
};

/** Detects the rendering context: 'banner' if inside BannerRoot, 'default' otherwise */
function useButtonContext(): 'banner' | 'default' {
  const bannerContext = useOptionalBannerRootContext();
  return bannerContext != null ? 'banner' : 'default';
}

/**
 * Computes inline style for the banner wrapper. All position/top/bottom/zIndex/height
 * are set via inline style (no modifier classes).
 */
export function getBannerWrapperStyle(
  data: BannerData,
  themeSetting?: ThemeTypesSetting,
  zIndex?: number,
  measuredHeight?: number | null,
): CSSProperties {
  // The live in-frame measurement (content + padding) is authoritative — the
  // stored data.height is a builder-era snapshot (absent on API-authored
  // banners, stale after theme font changes). Until the first measurement,
  // fall back to the snapshot + current theme padding, like before.
  const bannerPadding = themeSetting?.banner?.padding ?? 8; // default padding is 8px
  const contentHeight = data?.height ?? BANNER_DEFAULT_HEIGHT_PX;
  const heightPx = measuredHeight ?? contentHeight + bannerPadding * 2;
  const overlay = data?.overlayEmbedOverAppContent ?? false;
  const sticky = data?.stickToTopOfViewport ?? false;

  const style: CSSProperties = {
    ['--usertour-widget-banner-height' as string]: `${heightPx}px`,
  };

  // position from overlay + sticky
  if (!overlay && sticky) {
    style.position = 'sticky';
  } else if (overlay && !sticky) {
    style.position = 'absolute';
  } else if (overlay && sticky) {
    style.position = 'fixed';
  } else {
    style.position = 'relative';
  }

  if (style.position !== 'relative') {
    // Only set zIndex when position is not relative (sticky/absolute/fixed)
    if (zIndex !== undefined) style.zIndex = zIndex;
    style.left = 0;
    style.right = 0;

    // top vs bottom from embedPlacement
    const placement = data?.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
    const isTop =
      placement === BannerEmbedPlacement.TOP_OF_PAGE ||
      placement === BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT ||
      placement === BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT;
    if (isTop) {
      style.top = 0;
    } else {
      style.bottom = 0;
    }
  }

  if (data?.animateWhenEmbedAppears) {
    // `undefined` = caller doesn't participate in measure-then-reveal (legacy
    // path, e.g. the SDK's direct call) -> old behavior, always visible.
    // `null` = measurement pending -> stay hidden until it lands.
    if (measuredHeight === null) {
      // Measure-then-reveal: keep the banner invisible until the real height
      // is known, so the reveal animation never runs against the fallback
      // height and then visibly jumps to the corrected one.
      style.visibility = 'hidden';
    } else {
      const duration =
        themeSetting?.banner?.animationDuration ?? BANNER_DEFAULT_ANIMATION_DURATION_MS;
      const timing = themeSetting?.banner?.animationTiming ?? BANNER_DEFAULT_ANIMATION_TIMING;
      style.animationName = WidgetAnimation.bannerReveal;
      style.animationDuration = `${duration}ms`;
      style.animationTimingFunction = BANNER_ANIMATION_TIMING_PRESETS[timing];
    }
  }

  return style;
}

function getBannerContentWrapperStyle(data: BannerData): CSSProperties {
  const style: CSSProperties = {};
  if (data?.maxEmbedWidth != null) {
    style.maxWidth = `${data.maxEmbedWidth}px`;
  }
  if (data?.borderRadius != null) {
    style.borderRadius = `${data.borderRadius}px`;
    style.border = 'none';
  }
  if (data?.outerMargin) {
    const { top, right, bottom, left } = data.outerMargin;
    style.margin = `${top}px ${right}px ${bottom}px ${left}px`;
  }
  return style;
}

const BANNER_DISMISS_BUTTON_CLASS = cn(
  'rounded size-sdk-button',
  'inline-flex items-center justify-center',
  'text-sdk-banner-foreground',
  'hover:bg-sdk-banner-hover',
  'outline-none cursor-pointer',
);

interface BannerDismissButtonProps {
  onClick: () => void;
  className?: string;
}

const BannerDismissButton = memo((props: BannerDismissButtonProps) => {
  const { onClick, className } = props;
  return (
    <Button
      variant="custom"
      type="button"
      className={cn(BANNER_DISMISS_BUTTON_CLASS, className)}
      onClick={onClick}
      aria-label="Dismiss banner"
    >
      <RiCloseLargeFill className="size-4" />
    </Button>
  );
});

BannerDismissButton.displayName = 'BannerDismissButton';

interface BannerContentContainerProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}

const BannerContentContainer = memo(
  forwardRef<HTMLDivElement, BannerContentContainerProps>((props, ref) => {
    const { children, style, className } = props;
    const containerClassName = cn(
      'h-full w-full relative flex justify-between gap-x-2 p-sdk-banner bg-sdk-banner text-sdk-banner-foreground',
      className,
    );

    return (
      <div ref={ref} className={containerClassName} style={style}>
        {children}
      </div>
    );
  }),
);

BannerContentContainer.displayName = 'BannerContentContainer';

interface BannerRootProps {
  themeSettings: ThemeTypesSetting;
  data: BannerData;
  zIndex?: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  onDismiss?: () => void;
  /**
   * Fires with the live-measured banner height (content + padding) — and with
   * the fail-open fallback if no measurement lands. Hosts that style their own
   * wrapper element (the SDK's portal mount node) feed this back into
   * getBannerWrapperStyle's 4th argument.
   */
  onMeasuredHeightChange?: (height: number | null) => void;
  children?: React.ReactNode;
}

const BannerRoot = memo((props: BannerRootProps) => {
  const { data, zIndex, assets, onDismiss, themeSettings, onMeasuredHeightChange, children } =
    props;
  const { globalStyle: derivedGlobalStyle, themeSetting } = useSettingsStyles(themeSettings, {
    type: 'banner',
  });
  const globalStyle = props.globalStyle ?? derivedGlobalStyle;
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const onContentSizeChange = useCallback((rect: { width: number; height: number }) => {
    if (rect.height > 0) {
      setMeasuredHeight(rect.height);
    }
  }, []);
  useEffect(() => {
    onMeasuredHeightChange?.(measuredHeight);
  }, [measuredHeight, onMeasuredHeightChange]);
  // Fail open: if no measurement arrives (observer quirk, empty content),
  // reveal at the fallback height rather than staying hidden forever.
  useEffect(() => {
    if (measuredHeight !== null) {
      return;
    }
    const timer = setTimeout(() => {
      setMeasuredHeight((current) => {
        if (current !== null) {
          return current;
        }
        const padding = themeSetting?.banner?.padding ?? 8;
        return (data?.height ?? BANNER_DEFAULT_HEIGHT_PX) + padding * 2;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [measuredHeight, data?.height, themeSetting]);

  const contextValue = useMemo<BannerRootContextValue>(
    () => ({
      globalStyle,
      themeSetting,
      data,
      zIndex,
      assets,
      onDismiss,
      measuredHeight,
      onContentSizeChange,
    }),
    [
      globalStyle,
      themeSetting,
      data,
      zIndex,
      assets,
      onDismiss,
      measuredHeight,
      onContentSizeChange,
    ],
  );

  return <BannerRootContext.Provider value={contextValue}>{children}</BannerRootContext.Provider>;
});

BannerRoot.displayName = 'BannerRoot';

interface BannerContainerProps {
  children: React.ReactNode;
}

const BannerContainer = forwardRef<HTMLDivElement, BannerContainerProps>(({ children }, ref) => {
  const { globalStyle } = useBannerRootContext();
  const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
    if (el?.style) {
      el.style.cssText = globalStyle;
    }
  });

  return <div ref={composedRefs}>{children}</div>;
});

BannerContainer.displayName = 'BannerContainer';

interface BannerWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Force a static, non-sticky/non-overlay wrapper style for previews. */
  previewMode?: boolean;
}

/** Shared outer container (usertour-widget-banner + wrapper style) for both Frame and Inline. */
const BannerWrapper = memo(
  forwardRef<HTMLDivElement, BannerWrapperProps>((props, ref) => {
    const { children, previewMode, ...restProps } = props;
    const { data, themeSetting, zIndex, measuredHeight } = useBannerRootContext();
    const wrapperStyle = useMemo(() => {
      if (previewMode) {
        return {
          position: 'relative',
          ['--usertour-widget-banner-height' as string]: 'auto',
        } as CSSProperties;
      }
      return getBannerWrapperStyle(data, themeSetting, zIndex, measuredHeight);
    }, [data, previewMode, themeSetting, zIndex, measuredHeight]);
    return (
      <div ref={ref} className="usertour-widget-banner" style={wrapperStyle} {...restProps}>
        {children}
      </div>
    );
  }),
);

BannerWrapper.displayName = 'BannerWrapper';

type BannerFrameProps = React.ComponentProps<typeof Frame>;

const BannerFrame = memo(
  forwardRef<HTMLIFrameElement, BannerFrameProps>((props, ref) => {
    const { children, className, ...restProps } = props;
    const { data, globalStyle, assets } = useBannerRootContext();
    const contentWrapperStyle = useMemo(() => getBannerContentWrapperStyle(data), [data]);
    const frameClassName = cn('usertour-widget-banner-frame', className);

    return (
      <Frame
        ref={ref}
        assets={assets ?? []}
        className={frameClassName}
        defaultStyle={contentWrapperStyle}
        {...restProps}
      >
        <BannerInFrame globalStyle={globalStyle}>{children}</BannerInFrame>
      </Frame>
    );
  }),
);

BannerFrame.displayName = 'BannerFrame';

interface BannerInFrameProps {
  globalStyle: string;
  /** Content to render inside the banner (e.g. ContentEditorSerialize in runtime). */
  children?: React.ReactNode;
}

const BannerInFrame = memo((props: BannerInFrameProps) => {
  const { globalStyle, children } = props;
  const { data, onDismiss, onContentSizeChange } = useBannerRootContext();
  const { document } = useFrame();
  // Live-measure the rendered banner (content + its padding) and report it to
  // the host-side wrapper — same measure-inside/apply-outside pattern as
  // PopperContentInFrame. An iframe can't size itself to its content.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRect = useSize(containerEl);
  useEffect(() => {
    if (containerRect) {
      onContentSizeChange?.(containerRect);
    }
  }, [containerRect, onContentSizeChange]);
  // Don't wait for the ResizeObserver's first tick (it can lag or, in some
  // frame setups, never fire): measure synchronously as soon as the element
  // mounts so the reveal isn't gated on observer plumbing.
  useEffect(() => {
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      if (rect.height > 0) {
        onContentSizeChange?.({ width: rect.width, height: rect.height });
      }
    }
  }, [containerEl, onContentSizeChange]);

  useEffect(() => {
    if (document?.body) {
      document.documentElement.style.height = '100%';
      document.documentElement.style.width = '100%';
      document.body.style.cssText = globalStyle;
      document.body.style.height = '100%';
      document.body.style.width = '100%';
      document.body.style.margin = '0';
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  const showDismiss = data?.allowUsersToDismissEmbed ?? false;

  const contentMaxWidth = useMemo(
    () =>
      data?.maxContentWidth
        ? ({ maxWidth: `${data.maxContentWidth}px` } as CSSProperties)
        : undefined,
    [data?.maxContentWidth],
  );

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  return (
    // h-auto (overrides the container's h-full): the measurement must read the
    // CONTENT's natural height — with h-full the container tracks the iframe,
    // which tracks this very measurement (circular). The frame is sized to the
    // container, so nothing is lost by not stretching.
    <BannerContentContainer ref={setContainerEl} className="h-auto">
      <div
        className="min-w-0 flex-1 w-full mx-auto flex flex-col justify-center"
        style={contentMaxWidth}
      >
        {children}
      </div>
      {showDismiss && <BannerDismissButton className="flex-none" onClick={handleDismiss} />}
    </BannerContentContainer>
  );
});

BannerInFrame.displayName = 'BannerInFrame';

interface BannerPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the banner (e.g. ContentEditor in builder preview). */
  children?: React.ReactNode;
  /** Force a static, non-sticky/non-overlay wrapper style for previews. */
  previewMode?: boolean;
}

const BannerPreview = memo(
  forwardRef<HTMLDivElement, BannerPreviewProps>((props, ref) => {
    const { children, previewMode, ...restProps } = props;
    const { data, onDismiss } = useBannerRootContext();
    const contentStyle = useMemo(() => getBannerContentWrapperStyle(data), [data]);
    const showDismiss = data?.allowUsersToDismissEmbed ?? false;

    const contentMaxWidth = useMemo(
      () =>
        data?.maxContentWidth
          ? ({ maxWidth: `${data.maxContentWidth}px` } as CSSProperties)
          : undefined,
      [data?.maxContentWidth],
    );

    const handleDismiss = useCallback(() => {
      onDismiss?.();
    }, [onDismiss]);

    return (
      <BannerWrapper ref={ref} previewMode={previewMode} {...restProps}>
        <BannerContentContainer style={contentStyle}>
          <div
            className="min-w-0 flex-1 w-full mx-auto flex flex-col justify-center"
            style={contentMaxWidth}
          >
            {children}
          </div>
          {showDismiss && <BannerDismissButton className="flex-none" onClick={handleDismiss} />}
        </BannerContentContainer>
      </BannerWrapper>
    );
  }),
);

BannerPreview.displayName = 'BannerPreview';

export {
  BannerRoot,
  BannerContainer,
  BannerWrapper,
  BannerFrame,
  BannerInFrame,
  BannerPreview,
  BannerDismissButton,
  BannerContentContainer,
  getBannerContentWrapperStyle,
  useOptionalBannerRootContext,
  useButtonContext,
};
