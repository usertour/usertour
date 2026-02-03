import type { AssetAttributes } from '@usertour-packages/frame';
import { Frame, useFrame } from '@usertour-packages/frame';
import { RiCloseLargeFill } from '@usertour-packages/icons';
import type { BannerData, ThemeTypesSetting } from '@usertour/types';
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
} from 'react';

import { useComposedRefs } from '@usertour-packages/react-compose-refs';

import { Button } from '../primitives';
import { useSettingsStyles } from './hooks/use-settings-styles';
import { cn } from '@usertour-packages/tailwind';

const BANNER_DEFAULT_HEIGHT_PX = 56;
const BANNER_DEFAULT_Z_INDEX = 1234500;

interface BannerRootContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: BannerData;
  zIndex: number;
  assets?: AssetAttributes[];
  onDismiss?: () => void;
  /** Optional ref/callback for the content wrapper div (e.g. for height measurement in builder). */
  contentContainerRef?: React.Ref<HTMLDivElement>;
}

const BannerRootContext = createContext<BannerRootContextValue | null>(null);

const useBannerRootContext = () => {
  const context = useContext(BannerRootContext);
  if (!context) {
    throw new Error('useBannerRootContext must be used within a BannerRoot.');
  }
  return context;
};

/**
 * Computes inline style for the banner wrapper. All position/top/bottom/zIndex/height
 * are set via inline style (no modifier classes).
 */
export function getBannerWrapperStyle(data: BannerData): CSSProperties {
  const heightPx = data?.height ?? BANNER_DEFAULT_HEIGHT_PX;
  const zIndex = data?.zIndex ?? BANNER_DEFAULT_Z_INDEX;
  const overlay = data?.overlayEmbedOverAppContent ?? false;
  const sticky = data?.stickToTopOfViewport ?? false;

  const style: CSSProperties = {
    left: 0,
    right: 0,
    zIndex,
    height: `${heightPx}px`,
    ['--usertour-widget-banner-height' as string]: `${heightPx}px`,
  };

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

  if (data?.animateWhenEmbedAppears) {
    style.animationName = 'usertour-widget-banner-animate-in';
    style.animationDuration = '400ms';
    style.animationTimingFunction = 'ease-in-out';
  }

  return style;
}

function getBannerContentWrapperStyle(data: BannerData): CSSProperties {
  const style: CSSProperties = {};
  if (data?.maxContentWidth != null) {
    style.maxWidth = `${data.maxContentWidth}px`;
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
  'absolute top-1/2 -translate-y-1/2 right-2 size-6 rounded',
  'inline-flex items-center justify-center',
  'text-sdk-banner-foreground',
  'hover:bg-sdk-banner-hover',
  'outline-none cursor-pointer',
);

interface BannerDismissButtonProps {
  onClick: () => void;
}

const BannerDismissButton = memo((props: BannerDismissButtonProps) => {
  const { onClick } = props;
  return (
    <Button
      variant="custom"
      type="button"
      className={BANNER_DISMISS_BUTTON_CLASS}
      onClick={onClick}
      aria-label="Dismiss banner"
    >
      <RiCloseLargeFill className="size-4" />
    </Button>
  );
});

BannerDismissButton.displayName = 'BannerDismissButton';

interface BannerRootProps {
  themeSettings: ThemeTypesSetting;
  data: BannerData;
  zIndex?: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  onDismiss?: () => void;
  children?: React.ReactNode;
  /** Optional ref/callback for the content wrapper div (e.g. for height measurement in builder). */
  contentContainerRef?: React.Ref<HTMLDivElement>;
}

const BannerRoot = memo((props: BannerRootProps) => {
  const {
    data,
    zIndex: zIndexProp,
    assets,
    onDismiss,
    themeSettings,
    children,
    contentContainerRef,
  } = props;
  const { globalStyle: derivedGlobalStyle, themeSetting } = useSettingsStyles(themeSettings, {
    type: 'banner',
  });
  const globalStyle = props.globalStyle ?? derivedGlobalStyle;
  const zIndex = zIndexProp ?? data?.zIndex ?? BANNER_DEFAULT_Z_INDEX;

  const contextValue = useMemo<BannerRootContextValue>(
    () => ({
      globalStyle,
      themeSetting,
      data,
      zIndex,
      assets,
      onDismiss,
      contentContainerRef,
    }),
    [globalStyle, themeSetting, data, zIndex, assets, onDismiss, contentContainerRef],
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
}

/** Shared outer container (usertour-widget-banner + wrapper style) for both Frame and Inline. */
const BannerWrapper = memo(
  forwardRef<HTMLDivElement, BannerWrapperProps>((props, ref) => {
    const { children, ...restProps } = props;
    const { data } = useBannerRootContext();
    const wrapperStyle = useMemo(() => getBannerWrapperStyle(data), [data]);
    return (
      <div ref={ref} className="usertour-widget-banner" style={wrapperStyle} {...restProps}>
        {children}
      </div>
    );
  }),
);

BannerWrapper.displayName = 'BannerWrapper';

interface BannerFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the banner (e.g. ContentEditorSerialize in runtime). */
  children?: React.ReactNode;
}

const BannerFrame = memo(
  forwardRef<HTMLDivElement, BannerFrameProps>((props, ref) => {
    const { children, ...restProps } = props;
    const { data, globalStyle, assets } = useBannerRootContext();
    const contentWrapperStyle = useMemo(() => getBannerContentWrapperStyle(data), [data]);

    return (
      <BannerWrapper ref={ref} {...restProps}>
        <Frame
          assets={assets ?? []}
          className="usertour-widget-banner-frame"
          defaultStyle={contentWrapperStyle}
        >
          <BannerInFrame globalStyle={globalStyle}>{children}</BannerInFrame>
        </Frame>
      </BannerWrapper>
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
  const { data, onDismiss } = useBannerRootContext();
  const { document } = useFrame();

  useEffect(() => {
    if (document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  const showDismiss = data?.allowUsersToDismissEmbed ?? false;

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  return (
    <div className="h-full w-full flex items-center justify-center bg-sdk-banner-background text-sdk-banner-foreground">
      {children}
      {showDismiss && <BannerDismissButton onClick={handleDismiss} />}
    </div>
  );
});

BannerInFrame.displayName = 'BannerInFrame';

interface BannerInlineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the banner (e.g. ContentEditor in builder, ContentEditorSerialize in runtime). */
  children?: React.ReactNode;
}

const BannerInline = memo(
  forwardRef<HTMLDivElement, BannerInlineProps>((props, ref) => {
    const { children, ...restProps } = props;
    const { data, onDismiss, contentContainerRef } = useBannerRootContext();
    const contentStyle = useMemo(() => getBannerContentWrapperStyle(data), [data]);
    const showDismiss = data?.allowUsersToDismissEmbed ?? false;

    const handleDismiss = useCallback(() => {
      onDismiss?.();
    }, [onDismiss]);

    return (
      <BannerWrapper ref={ref} {...restProps}>
        <div
          className="h-full w-full flex items-center justify-center bg-sdk-banner text-sdk-banner-foreground"
          ref={contentContainerRef}
          style={contentStyle}
        >
          {children}
          {showDismiss && <BannerDismissButton onClick={handleDismiss} />}
        </div>
      </BannerWrapper>
    );
  }),
);

BannerInline.displayName = 'BannerInline';

export { BannerRoot, BannerContainer, BannerFrame, BannerInFrame, BannerInline };
