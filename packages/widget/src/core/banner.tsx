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
export function getBannerWrapperStyle(data: BannerData): CSSProperties {
  const heightPx = data?.height ?? BANNER_DEFAULT_HEIGHT_PX;
  const zIndex = data?.zIndex ?? BANNER_DEFAULT_Z_INDEX;
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
    style.zIndex = zIndex;
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
    style.animationName = 'usertour-widget-banner-animate-in';
    style.animationDuration = '400ms';
    style.animationTimingFunction = 'ease-in-out';
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

const BannerContentContainer = memo((props: BannerContentContainerProps) => {
  const { children, style, className } = props;
  const containerClassName = cn(
    'h-full w-full relative flex justify-between gap-x-2 p-sdk-banner bg-sdk-banner text-sdk-banner-foreground',
    className,
  );

  return (
    <div className={containerClassName} style={style}>
      {children}
    </div>
  );
});

BannerContentContainer.displayName = 'BannerContentContainer';

interface BannerRootProps {
  themeSettings: ThemeTypesSetting;
  data: BannerData;
  zIndex?: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

const BannerRoot = memo((props: BannerRootProps) => {
  const { data, zIndex: zIndexProp, assets, onDismiss, themeSettings, children } = props;
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
    }),
    [globalStyle, themeSetting, data, zIndex, assets, onDismiss],
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
    const { data } = useBannerRootContext();
    const wrapperStyle = useMemo(() => {
      if (previewMode) {
        return {
          position: 'relative',
          ['--usertour-widget-banner-height' as string]: 'auto',
        } as CSSProperties;
      }
      return getBannerWrapperStyle(data);
    }, [data, previewMode]);
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
  const { data, onDismiss } = useBannerRootContext();
  const { document } = useFrame();

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
    <BannerContentContainer>
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
