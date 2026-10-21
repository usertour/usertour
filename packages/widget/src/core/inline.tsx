import type { AssetAttributes } from '@usertour/frame';
import { Frame, useFrame } from '@usertour/frame';
import { useSize } from '@usertour/react-use-size';
import { RiCloseLargeFill } from '@usertour/icons';
import type { ThemeTypesSetting } from '@usertour/types';
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
import { useWidgetLocale } from '../locale/context';
import { cn } from '@usertour/tailwind';

/**
 * The inline shell: a framed block of editor content that lives in the host
 * page's layout instead of floating over it. Banner (one strip, page or
 * element placed) and embed (many cards, element placed) are two surfaces of
 * the same shell; each surface has its own theme section and class tokens,
 * everything else here is shared (ADR 0022).
 */
export type InlineSurface = 'banner' | 'embed';

export interface InlineOuterMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The per-content layout inputs the shell renders from. */
export interface InlineShell {
  allowDismiss: boolean;
  /** Max width of the content column inside the frame. */
  maxContentWidth?: number;
  /** Max width of the frame itself. */
  maxFrameWidth?: number;
  borderRadius?: number;
  outerMargin?: InlineOuterMargin;
  /**
   * Content height snapshot (excluding padding) taken by the builder; the
   * fallback before the first live measurement. Absent on API-authored
   * content.
   */
  height?: number;
}

const INLINE_DEFAULT_CONTENT_HEIGHT_PX = 56;
const INLINE_MEASURE_FAIL_OPEN_MS = 500;

const SURFACE_CLASSES: Record<InlineSurface, { container: string; dismiss: string }> = {
  banner: {
    container: 'p-sdk-banner bg-sdk-banner text-sdk-banner-foreground',
    dismiss: 'text-sdk-banner-foreground hover:bg-sdk-banner-hover',
  },
  embed: {
    container: 'p-sdk-embed bg-sdk-embed text-sdk-embed-foreground',
    dismiss: 'text-sdk-embed-foreground hover:bg-sdk-embed-hover',
  },
};

export interface InlineRootContextValue {
  surface: InlineSurface;
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  shell: InlineShell;
  zIndex?: number;
  assets?: AssetAttributes[];
  onDismiss?: () => void;
  /**
   * Live-measured height (content + padding), reported from inside the frame.
   * null until the first measurement; hosts that size their own wrapper keep
   * it hidden until then so a reveal never runs against a guessed height.
   */
  measuredHeight: number | null;
  onContentSizeChange?: (rect: { width: number; height: number }) => void;
}

const InlineRootContext = createContext<InlineRootContextValue | null>(null);

const useInlineRootContext = () => {
  const context = useContext(InlineRootContext);
  if (!context) {
    throw new Error('useInlineRootContext must be used within an InlineRoot.');
  }
  return context;
};

/** Returns the inline context when inside an InlineRoot, null otherwise. */
const useOptionalInlineRootContext = (): InlineRootContextValue | null => {
  return useContext(InlineRootContext);
};

/** The surface the caller renders on, or null outside any inline shell. */
const useInlineSurface = (): InlineSurface | null => {
  return useOptionalInlineRootContext()?.surface ?? null;
};

/** Frame-level style: the frame's own box, as opposed to the content column. */
export function getInlineContentWrapperStyle(shell: InlineShell): CSSProperties {
  // Always inline: the frame mounts outside #usertour-widget, where index.css's
  // iframe reset does not reach, so otherwise it keeps the browser's 2px inset
  // border (or the host's own iframe border).
  const style: CSSProperties = { border: 'none' };
  if (shell?.maxFrameWidth != null) {
    style.maxWidth = `${shell.maxFrameWidth}px`;
  }
  if (shell?.borderRadius != null) {
    style.borderRadius = `${shell.borderRadius}px`;
  }
  if (shell?.outerMargin) {
    const { top, right, bottom, left } = shell.outerMargin;
    style.margin = `${top}px ${right}px ${bottom}px ${left}px`;
  }
  return style;
}

const INLINE_DISMISS_BUTTON_CLASS = cn(
  'rounded size-sdk-button',
  'inline-flex items-center justify-center',
  'outline-none cursor-pointer',
);

export interface InlineDismissButtonProps {
  onClick: () => void;
  className?: string;
}

const InlineDismissButton = memo((props: InlineDismissButtonProps) => {
  const { onClick, className } = props;
  const { messages } = useWidgetLocale();
  const { surface } = useInlineRootContext();
  const label = surface === 'banner' ? messages.dismissBanner : messages.close;
  return (
    <Button
      variant="custom"
      type="button"
      className={cn(INLINE_DISMISS_BUTTON_CLASS, SURFACE_CLASSES[surface].dismiss, className)}
      onClick={onClick}
      aria-label={label}
    >
      <RiCloseLargeFill className="size-4" />
    </Button>
  );
});

InlineDismissButton.displayName = 'InlineDismissButton';

export interface InlineContentContainerProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}

const InlineContentContainer = memo(
  forwardRef<HTMLDivElement, InlineContentContainerProps>((props, ref) => {
    const { children, style, className } = props;
    const { surface } = useInlineRootContext();
    const containerClassName = cn(
      'h-full w-full relative flex justify-between gap-x-2',
      SURFACE_CLASSES[surface].container,
      className,
    );

    return (
      <div ref={ref} className={containerClassName} style={style}>
        {children}
      </div>
    );
  }),
);

InlineContentContainer.displayName = 'InlineContentContainer';

export interface InlineRootProps {
  surface: InlineSurface;
  themeSettings: ThemeTypesSetting;
  shell: InlineShell;
  zIndex?: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  onDismiss?: () => void;
  /**
   * Fires with the live-measured height (content + padding), and with the
   * fail-open fallback if no measurement lands. Hosts that style their own
   * wrapper element (the SDK's portal mount node) feed this back into their
   * wrapper style.
   */
  onMeasuredHeightChange?: (height: number | null) => void;
  /**
   * The surface's theme padding, read from the merged theme; the fail-open
   * fallback adds it on both sides of the content height snapshot.
   */
  getPadding: (themeSetting: ThemeTypesSetting | undefined) => number;
  children?: React.ReactNode;
}

const InlineRoot = memo((props: InlineRootProps) => {
  const {
    surface,
    shell,
    zIndex,
    assets,
    onDismiss,
    themeSettings,
    onMeasuredHeightChange,
    getPadding,
    children,
  } = props;
  const { globalStyle: derivedGlobalStyle, themeSetting } = useSettingsStyles(themeSettings, {
    type: surface,
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
        const padding = getPadding(themeSetting);
        return (shell?.height ?? INLINE_DEFAULT_CONTENT_HEIGHT_PX) + padding * 2;
      });
    }, INLINE_MEASURE_FAIL_OPEN_MS);
    return () => clearTimeout(timer);
  }, [measuredHeight, shell?.height, themeSetting, getPadding]);

  const contextValue = useMemo<InlineRootContextValue>(
    () => ({
      surface,
      globalStyle,
      themeSetting,
      shell,
      zIndex,
      assets,
      onDismiss,
      measuredHeight,
      onContentSizeChange,
    }),
    [
      surface,
      globalStyle,
      themeSetting,
      shell,
      zIndex,
      assets,
      onDismiss,
      measuredHeight,
      onContentSizeChange,
    ],
  );

  return <InlineRootContext.Provider value={contextValue}>{children}</InlineRootContext.Provider>;
});

InlineRoot.displayName = 'InlineRoot';

export interface InlineContainerProps {
  children: React.ReactNode;
}

/** A plain host-document container carrying the theme's CSS variables (non-iframe previews). */
const InlineContainer = forwardRef<HTMLDivElement, InlineContainerProps>(({ children }, ref) => {
  const { globalStyle } = useInlineRootContext();
  const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
    if (el?.style) {
      el.style.cssText = globalStyle;
    }
  });

  return <div ref={composedRefs}>{children}</div>;
});

InlineContainer.displayName = 'InlineContainer';

export interface InlineBodyProps {
  children?: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}

/** The content column plus the optional dismiss button, inside the content container. */
const InlineBody = memo(
  forwardRef<HTMLDivElement, InlineBodyProps>((props, ref) => {
    const { children, style, className } = props;
    const { shell, onDismiss } = useInlineRootContext();
    const showDismiss = shell?.allowDismiss ?? false;

    const contentMaxWidth = useMemo(
      () =>
        shell?.maxContentWidth
          ? ({ maxWidth: `${shell.maxContentWidth}px` } as CSSProperties)
          : undefined,
      [shell?.maxContentWidth],
    );

    const handleDismiss = useCallback(() => {
      onDismiss?.();
    }, [onDismiss]);

    return (
      <InlineContentContainer ref={ref} className={className} style={style}>
        <div
          className="min-w-0 flex-1 w-full mx-auto flex flex-col justify-center"
          style={contentMaxWidth}
        >
          {children}
        </div>
        {showDismiss && <InlineDismissButton className="flex-none" onClick={handleDismiss} />}
      </InlineContentContainer>
    );
  }),
);

InlineBody.displayName = 'InlineBody';

export type InlineFrameProps = React.ComponentProps<typeof Frame>;

const InlineFrame = memo(
  forwardRef<HTMLIFrameElement, InlineFrameProps>((props, ref) => {
    const { children, className, ...restProps } = props;
    const { surface, shell, globalStyle, assets } = useInlineRootContext();
    const contentWrapperStyle = useMemo(() => getInlineContentWrapperStyle(shell), [shell]);
    const frameClassName = cn(`usertour-widget-${surface}-frame`, className);

    return (
      <Frame
        ref={ref}
        assets={assets ?? []}
        className={frameClassName}
        defaultStyle={contentWrapperStyle}
        {...restProps}
      >
        <InlineInFrame globalStyle={globalStyle}>{children}</InlineInFrame>
      </Frame>
    );
  }),
);

InlineFrame.displayName = 'InlineFrame';

export interface InlineInFrameProps {
  globalStyle: string;
  /** Content to render inside the frame (e.g. ContentEditorSerialize at runtime). */
  children?: React.ReactNode;
}

const InlineInFrame = memo((props: InlineInFrameProps) => {
  const { globalStyle, children } = props;
  const { onContentSizeChange } = useInlineRootContext();
  const { document } = useFrame();
  // Live-measure the rendered content (plus its padding) and report it to the
  // host-side wrapper — same measure-inside/apply-outside pattern as
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

  return (
    // h-auto (overrides the container's h-full): the measurement must read the
    // CONTENT's natural height — with h-full the container tracks the iframe,
    // which tracks this very measurement (circular). The frame is sized to the
    // container, so nothing is lost by not stretching.
    <InlineBody ref={setContainerEl} className="h-auto">
      {children}
    </InlineBody>
  );
});

InlineInFrame.displayName = 'InlineInFrame';

export {
  InlineRoot,
  InlineContainer,
  InlineFrame,
  InlineInFrame,
  InlineBody,
  InlineDismissButton,
  InlineContentContainer,
  useInlineRootContext,
  useOptionalInlineRootContext,
  useInlineSurface,
};
