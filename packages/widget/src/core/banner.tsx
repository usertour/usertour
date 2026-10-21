import type { AssetAttributes } from '@usertour/frame';
import type { BannerAnimationTiming, BannerData, ThemeTypesSetting } from '@usertour/types';
import { BannerEmbedPlacement } from '@usertour/types';
import type { CSSProperties } from 'react';
import { createContext, forwardRef, memo, useContext, useMemo } from 'react';

import { WidgetAnimation } from './class-names';
import {
  InlineBody,
  InlineContainer,
  InlineContentContainer,
  InlineDismissButton,
  InlineFrame,
  InlineInFrame,
  InlineRoot,
  getInlineContentWrapperStyle,
  useInlineRootContext,
  useInlineSurface,
  useOptionalInlineRootContext,
  type InlineRootContextValue,
  type InlineShell,
} from './inline';

// The banner is one surface of the shared inline shell (./inline). What stays
// here is banner-only: the page/element wrapper positioning (overlay, sticky,
// top/bottom) and the reveal animation, plus the banner-shaped context the
// builder preview and the SDK already consume.

const BANNER_DEFAULT_HEIGHT_PX = 56;
const BANNER_DEFAULT_ANIMATION_DURATION_MS = 320;
const BANNER_DEFAULT_ANIMATION_TIMING: BannerAnimationTiming = 'smooth';

const BANNER_ANIMATION_TIMING_PRESETS: Record<BannerAnimationTiming, string> = {
  smooth: 'cubic-bezier(0.42, 0, 0.58, 1)',
  snappy: 'cubic-bezier(0.22, 1, 0.36, 1)',
  gentle: 'cubic-bezier(0, 0, 0.58, 1)',
  linear: 'linear',
};

/** Maps the banner's stored data onto the shared inline shell. */
const toInlineShell = (data: BannerData): InlineShell => ({
  allowDismiss: data?.allowUsersToDismissEmbed ?? false,
  maxContentWidth: data?.maxContentWidth,
  maxFrameWidth: data?.maxEmbedWidth,
  borderRadius: data?.borderRadius,
  outerMargin: data?.outerMargin,
  height: data?.height,
});

const getBannerPadding = (themeSetting: ThemeTypesSetting | undefined): number =>
  themeSetting?.banner?.padding ?? 8; // default padding is 8px

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

const BannerDataContext = createContext<BannerData | null>(null);

const toBannerRootContext = (
  inline: InlineRootContextValue,
  data: BannerData,
): BannerRootContextValue => ({
  globalStyle: inline.globalStyle,
  themeSetting: inline.themeSetting,
  data,
  zIndex: inline.zIndex,
  assets: inline.assets,
  onDismiss: inline.onDismiss,
  measuredHeight: inline.measuredHeight,
  onContentSizeChange: inline.onContentSizeChange,
});

const useBannerRootContext = (): BannerRootContextValue => {
  const inline = useInlineRootContext();
  const data = useContext(BannerDataContext);
  if (!data) {
    throw new Error('useBannerRootContext must be used within a BannerRoot.');
  }
  return useMemo(() => toBannerRootContext(inline, data), [inline, data]);
};

/** Returns Banner context when inside BannerRoot, null otherwise. Use for optional Banner-aware behavior (e.g. CTA button variants). */
const useOptionalBannerRootContext = (): BannerRootContextValue | null => {
  const inline = useOptionalInlineRootContext();
  const data = useContext(BannerDataContext);
  return useMemo(
    () =>
      inline && data && inline.surface === 'banner' ? toBannerRootContext(inline, data) : null,
    [inline, data],
  );
};

/** Detects the rendering context: 'banner' if inside BannerRoot, 'default' otherwise */
function useButtonContext(): 'banner' | 'default' {
  return useInlineSurface() === 'banner' ? 'banner' : 'default';
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
  const bannerPadding = getBannerPadding(themeSetting);
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
  return getInlineContentWrapperStyle(toInlineShell(data));
}

const BannerDismissButton = InlineDismissButton;

const BannerContentContainer = InlineContentContainer;

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
  const { data, zIndex, assets, onDismiss, themeSettings, globalStyle, onMeasuredHeightChange } =
    props;
  const shell = useMemo(() => toInlineShell(data), [data]);

  return (
    <InlineRoot
      surface="banner"
      themeSettings={themeSettings}
      shell={shell}
      zIndex={zIndex}
      assets={assets}
      globalStyle={globalStyle}
      onDismiss={onDismiss}
      onMeasuredHeightChange={onMeasuredHeightChange}
      getPadding={getBannerPadding}
    >
      <BannerDataContext.Provider value={data}>{props.children}</BannerDataContext.Provider>
    </InlineRoot>
  );
});

BannerRoot.displayName = 'BannerRoot';

const BannerContainer = InlineContainer;

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

const BannerFrame = InlineFrame;

const BannerInFrame = InlineInFrame;

interface BannerPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the banner (e.g. ContentEditor in builder preview). */
  children?: React.ReactNode;
  /** Force a static, non-sticky/non-overlay wrapper style for previews. */
  previewMode?: boolean;
}

const BannerPreview = memo(
  forwardRef<HTMLDivElement, BannerPreviewProps>((props, ref) => {
    const { children, previewMode, ...restProps } = props;
    const { data } = useBannerRootContext();
    const contentStyle = useMemo(() => getBannerContentWrapperStyle(data), [data]);

    return (
      <BannerWrapper ref={ref} previewMode={previewMode} {...restProps}>
        <InlineBody style={contentStyle}>{children}</InlineBody>
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
