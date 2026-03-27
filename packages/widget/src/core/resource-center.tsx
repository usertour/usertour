import {
  ResourceCenterBlockType,
  ResourceCenterData,
  ResourceCenterMessageBlock,
  ResourceCenterPlacement,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { DropDownIcon, QuestionMarkCircledIcon, UsertourIcon } from '@usertour-packages/icons';
import {
  createContext,
  forwardRef,
  memo,
  type HTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSettingsStyles } from './hooks/use-settings-styles';
import { ContentEditorSerialize } from '../serialize/content-editor-serialize';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { AssetAttributes, Frame, useFrame } from '@usertour-packages/frame';
import { useSize } from '@usertour-packages/react-use-size';
import { cn } from '@usertour-packages/tailwind';
import { Button } from '../primitives';
import { computePositionStyle } from './utils/position';

interface ResourceCenterAnchorProps extends HTMLAttributes<HTMLDivElement> {
  anchor?: React.ReactNode;
}

const ResourceCenterAnchor = forwardRef<HTMLDivElement, ResourceCenterAnchorProps>(
  ({ anchor, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <div className="relative">
          {children}
          {anchor}
        </div>
      </div>
    );
  },
);

ResourceCenterAnchor.displayName = 'ResourceCenterAnchor';

// ============================================================================
// Placement mapping
// ============================================================================

const resourceCenterPlacementToPosition = (placement: ResourceCenterPlacement) => {
  const map: Record<ResourceCenterPlacement, string> = {
    'top-left': 'leftTop',
    'top-right': 'rightTop',
    'bottom-left': 'leftBottom',
    'bottom-right': 'rightBottom',
  };
  return map[placement] ?? map['bottom-right'];
};

// ============================================================================
// Context
// ============================================================================

interface ResourceCenterRootContextValue {
  globalStyle: string;
  themeSetting: ThemeTypesSetting;
  data: ResourceCenterData;
  isOpen: boolean;
  isAnimating: boolean;
  handleExpandedChange: (expanded: boolean) => Promise<void>;
  zIndex: number;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith: boolean;
}

const ResourceCenterRootContext = createContext<ResourceCenterRootContextValue | null>(null);

const useResourceCenterRootContext = () => {
  const context = useContext(ResourceCenterRootContext);
  if (!context) {
    throw new Error('useResourceCenterRootContext must be used within a ResourceCenterRoot.');
  }
  return context;
};

// ============================================================================
// Root
// ============================================================================

interface ResourceCenterRootProps {
  children: React.ReactNode;
  themeSettings: ThemeTypesSetting;
  data: ResourceCenterData;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => Promise<void>;
  zIndex: number;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith?: boolean;
}

const ResourceCenterRoot = memo((props: ResourceCenterRootProps) => {
  const {
    children,
    data,
    expanded = false,
    onExpandedChange,
    zIndex,
    themeSettings,
    userAttributes,
    onContentClick,
    checklistSlot,
    showMadeWith = true,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);

  const isOpen = expanded;
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimerRef = useRef<number | null>(null);

  const handleExpandedChange = useCallback(
    async (open: boolean) => {
      const duration = themeSetting.resourceCenter?.transitionDuration ?? 450;

      setIsAnimating(true);
      if (animationTimerRef.current != null) {
        window.clearTimeout(animationTimerRef.current);
      }
      await onExpandedChange?.(open);
      animationTimerRef.current = window.setTimeout(() => {
        setIsAnimating(false);
      }, duration);
    },
    [onExpandedChange, themeSetting.resourceCenter?.transitionDuration],
  );

  useEffect(() => {
    return () => {
      if (animationTimerRef.current != null) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      globalStyle,
      themeSetting,
      data,
      isOpen,
      isAnimating,
      handleExpandedChange,
      zIndex,
      userAttributes,
      onContentClick,
      checklistSlot,
      showMadeWith,
    }),
    [
      globalStyle,
      themeSetting,
      data,
      isOpen,
      isAnimating,
      handleExpandedChange,
      zIndex,
      userAttributes,
      onContentClick,
      checklistSlot,
      showMadeWith,
    ],
  );

  return (
    <ResourceCenterRootContext.Provider value={contextValue}>
      {children}
    </ResourceCenterRootContext.Provider>
  );
});

ResourceCenterRoot.displayName = 'ResourceCenterRoot';

// ============================================================================
// Container — applies globalStyle CSS vars (like ChecklistContainer)
// ============================================================================

const ResourceCenterContainer = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const { globalStyle } = useResourceCenterRootContext();
    const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
      if (el?.style) {
        el.style.cssText = globalStyle;
      }
    });

    return <div ref={composedRefs}>{children}</div>;
  },
);

ResourceCenterContainer.displayName = 'ResourceCenterContainer';

// ============================================================================
// Launcher icon
// ============================================================================

const ResourceCenterLauncherIcon = memo(
  ({
    iconType,
    iconUrl,
    imageHeight,
  }: {
    iconType?: string;
    iconUrl?: string;
    imageHeight?: number;
  }) => {
    if (iconType === 'custom' && iconUrl) {
      return (
        <img
          src={iconUrl}
          alt=""
          style={{ height: imageHeight ?? 28, width: 'auto', objectFit: 'contain' }}
        />
      );
    }
    if (iconType === 'plaintext-question-mark') {
      return (
        <span className="text-lg font-bold leading-none" style={{ fontSize: imageHeight ?? 28 }}>
          ?
        </span>
      );
    }
    return <QuestionMarkCircledIcon width={imageHeight ?? 28} height={imageHeight ?? 28} />;
  },
);

ResourceCenterLauncherIcon.displayName = 'ResourceCenterLauncherIcon';

// ============================================================================
// Badge
// ============================================================================

interface ResourceCenterBadgeProps {
  count: number;
}

const ResourceCenterBadge = memo(({ count }: ResourceCenterBadgeProps) => {
  if (count <= 0) return null;

  return (
    <div className="usertour-widget-resource-center-launcher-unread-badge flex items-center justify-center text-xs font-bold min-w-[24px] h-6 px-1.5 bg-sdk-resource-center-badge-background text-sdk-resource-center-badge-foreground">
      {count}
    </div>
  );
});

ResourceCenterBadge.displayName = 'ResourceCenterBadge';

// ============================================================================
// Launcher (like ChecklistLauncher — fixed position button)
// ============================================================================

interface ResourceCenterLauncherContentProps {
  onClick?: () => void;
  badgeCount?: number;
  launcherText?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  layout?: 'fill' | 'inline';
}

const ResourceCenterLauncherContent = forwardRef<
  HTMLButtonElement,
  ResourceCenterLauncherContentProps
>((props, ref) => {
  const { onClick, badgeCount = 0, launcherText, onSizeChange, layout = 'fill' } = props;
  const { themeSetting, data } = useResourceCenterRootContext();
  const launcher = themeSetting.resourceCenterLauncherButton;

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
  const rect = useSize(contentRef);

  useEffect(() => {
    if (rect) {
      onSizeChange?.(rect);
    }
  }, [rect, onSizeChange]);

  const resolvedText = useMemo(() => {
    if (launcher?.textMode === 'no-text') return undefined;
    if (launcher?.textMode === 'active-checklist-text' && launcherText) return launcherText;
    return data.buttonText;
  }, [launcher?.textMode, launcherText, data.buttonText]);

  const buttonClassName = cn(
    'usertour-widget-resource-center-launcher-button',
    'rounded-sdk-resource-center-launcher flex bg-transparent',
    'cursor-pointer items-center',
    layout === 'fill' ? 'h-full w-full justify-center' : 'inline-flex justify-start',
    'hover:bg-sdk-resource-center-launcher-hover',
    'active:bg-sdk-resource-center-launcher-active',
    'focus-visible:outline-none',
    'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-transparent',
    'focus-visible:ring-offset-[3px] focus-visible:ring-offset-sdk-resource-center-launcher-foreground/30',
    'text-sdk-resource-center-launcher-foreground font-sdk-resource-center-launcher',
  );

  return (
    <Button
      variant="custom"
      ref={ref}
      style={{
        minWidth: launcher?.height ?? 60,
        height: launcher?.height ?? 60,
      }}
      className={buttonClassName}
      onClick={onClick}
      aria-label={`Open ${data.buttonText}${badgeCount > 0 ? ` (${badgeCount} unread)` : ''}`}
    >
      <div
        ref={setContentRef}
        className="flex items-center whitespace-nowrap gap-2"
        style={{
          paddingLeft: launcher?.height ? `${Number(launcher.height) / 2}px` : undefined,
          paddingRight: launcher?.height ? `${Number(launcher.height) / 2}px` : undefined,
          transitionDuration: 'var(--usertour-resource-center-transition-duration)',
        }}
      >
        {badgeCount > 0 && (
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-sdk-resource-center-launcher-foreground/10 px-2 text-sm font-bold text-sdk-resource-center-launcher-foreground">
            {badgeCount}
          </span>
        )}
        {resolvedText && (
          <span className="text-sm font-semibold whitespace-nowrap">{resolvedText}</span>
        )}
        {(badgeCount > 0 || resolvedText) && (
          <span className="h-6 w-px bg-sdk-resource-center-launcher-foreground/20" />
        )}
        <span className="flex items-center justify-center">
          <ResourceCenterLauncherIcon
            iconType={launcher?.iconType}
            iconUrl={launcher?.iconUrl}
            imageHeight={launcher?.imageHeight}
          />
        </span>
      </div>
    </Button>
  );
});

ResourceCenterLauncherContent.displayName = 'ResourceCenterLauncherContent';

interface ResourceCenterLauncherProps {
  badgeCount?: number;
  launcherText?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  frameStyle?: React.CSSProperties;
}

const ResourceCenterLauncher = forwardRef<HTMLDivElement, ResourceCenterLauncherProps>(
  (props, ref) => {
    const { onClick, badgeCount, launcherText, style, frameStyle } = props;
    const { themeSetting, zIndex } = useResourceCenterRootContext();
    const rc = themeSetting.resourceCenter;
    const launcher = themeSetting.resourceCenterLauncherButton;
    const positionStyle = computePositionStyle(
      resourceCenterPlacementToPosition(rc?.placement ?? 'bottom-right'),
      rc?.offsetX ?? 20,
      rc?.offsetY ?? 20,
    );

    return (
      <div ref={ref} className="relative" style={{ zIndex, ...positionStyle, ...style }}>
        <div className="relative">
          <div
            className="usertour-widget-resource-center-launcher"
            style={{
              height: launcher?.height ?? 60,
              borderRadius: launcher?.borderRadius,
              ...frameStyle,
            }}
          >
            <ResourceCenterLauncherContent
              onClick={onClick}
              badgeCount={badgeCount}
              launcherText={launcherText}
            />
          </div>
        </div>
      </div>
    );
  },
);

ResourceCenterLauncher.displayName = 'ResourceCenterLauncher';

// ============================================================================
// Launcher Frame (like ChecklistLauncherFrame — iframe variant for SDK)
// ============================================================================

interface ResourceCenterLauncherFrameProps {
  assets: AssetAttributes[] | undefined;
  badgeCount?: number;
  launcherText?: string;
}

const ResourceCenterLauncherFrame = forwardRef<HTMLIFrameElement, ResourceCenterLauncherFrameProps>(
  (props, ref) => {
    const { assets, badgeCount, launcherText } = props;
    const { globalStyle, themeSetting, zIndex } = useResourceCenterRootContext();
    const [launcherRect, setLauncherRect] = useState<{ width: number; height: number } | null>(
      null,
    );

    const rc = themeSetting.resourceCenter;
    const launcher = themeSetting.resourceCenterLauncherButton;
    const style = computePositionStyle(
      resourceCenterPlacementToPosition(rc?.placement ?? 'bottom-right'),
      rc?.offsetX ?? 20,
      rc?.offsetY ?? 20,
    );
    const width = launcherRect?.width ? `${launcherRect.width}px` : undefined;

    return (
      <div
        className="relative"
        style={{
          zIndex,
          ...style,
        }}
      >
        <div className="relative">
          <Frame
            assets={assets}
            ref={ref}
            className="usertour-widget-resource-center-launcher"
            defaultStyle={{
              width,
              height: launcher?.height ?? 60,
              borderRadius: launcher?.borderRadius,
            }}
          >
            <ResourceCenterLauncherInFrame
              globalStyle={globalStyle}
              onSizeChange={setLauncherRect}
              badgeCount={badgeCount}
              launcherText={launcherText}
            />
          </Frame>
        </div>
      </div>
    );
  },
);

ResourceCenterLauncherFrame.displayName = 'ResourceCenterLauncherFrame';

interface ResourceCenterLauncherInFrameProps {
  globalStyle?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  badgeCount?: number;
  launcherText?: string;
}

const ResourceCenterLauncherInFrame = forwardRef<
  HTMLDivElement,
  ResourceCenterLauncherInFrameProps
>((props, _) => {
  const { globalStyle, onSizeChange, badgeCount, launcherText } = props;
  const { handleExpandedChange } = useResourceCenterRootContext();
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return (
    <ResourceCenterLauncherContent
      onClick={async () => await handleExpandedChange(true)}
      onSizeChange={onSizeChange}
      badgeCount={badgeCount}
      launcherText={launcherText}
    />
  );
});

ResourceCenterLauncherInFrame.displayName = 'ResourceCenterLauncherInFrame';

interface ResourceCenterProps {
  children?: React.ReactNode;
  badgeCount?: number;
  launcherText?: string;
  openHeightOverride?: number;
  closedWidthOverride?: number;
}

interface ResourceCenterViewportProps {
  children: React.ReactNode;
  launcherText?: string;
  isAnimating?: boolean;
}

const getResourceCenterFrameClassName = (isOpen: boolean, isAnimating: boolean) =>
  cn(
    'usertour-widget-resource-center-frame',
    isAnimating && 'usertour-widget-resource-center-frame--animating',
    isOpen
      ? 'usertour-widget-resource-center-frame--open'
      : 'usertour-widget-resource-center-frame--closed',
  );

const ResourceCenterFrameRoot = memo(
  ({ children, launcherText, isAnimating = false }: ResourceCenterViewportProps) => {
    const { isOpen, handleExpandedChange } = useResourceCenterRootContext();
    const [launcherButtonContainer, setLauncherButtonContainer] = useState<HTMLDivElement | null>(
      null,
    );
    const [panelContainer, setPanelContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
      const activeElement = document.activeElement;

      if (
        isOpen &&
        launcherButtonContainer &&
        activeElement instanceof HTMLElement &&
        launcherButtonContainer.contains(activeElement)
      ) {
        activeElement.blur();
      }

      if (
        !isOpen &&
        panelContainer &&
        activeElement instanceof HTMLElement &&
        panelContainer.contains(activeElement)
      ) {
        activeElement.blur();
      }
    }, [isOpen, launcherButtonContainer, panelContainer]);

    return (
      <div
        className={cn(
          'usertour-widget-resource-center-frame-root',
          isAnimating && 'usertour-widget-resource-center-frame-root--animating',
          isOpen
            ? 'usertour-widget-resource-center-frame-root--open'
            : 'usertour-widget-resource-center-frame-root--closed',
          'relative h-full w-full overflow-hidden usertour-root text-sdk-foreground',
        )}
      >
        <div
          ref={setLauncherButtonContainer}
          className="usertour-widget-resource-center-launcher-container bg-sdk-resource-center-launcher-background"
        >
          <div className="usertour-widget-resource-center-launcher-button-wrap">
            <ResourceCenterLauncherContent
              onClick={async () => await handleExpandedChange(true)}
              launcherText={launcherText}
              layout="inline"
            />
          </div>
        </div>
        <div ref={setPanelContainer} className="contents">
          {children}
        </div>
      </div>
    );
  },
);

ResourceCenterFrameRoot.displayName = 'ResourceCenterFrameRoot';

const ResourceCenter = forwardRef<
  HTMLDivElement,
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onClick'> & ResourceCenterProps
>((props, ref) => {
  const {
    children,
    badgeCount,
    launcherText,
    openHeightOverride,
    closedWidthOverride,
    ...restProps
  } = props;
  const { themeSetting, zIndex, isOpen, isAnimating } = useResourceCenterRootContext();
  const [launcherMeasureRef, setLauncherMeasureRef] = useState<HTMLDivElement | null>(null);
  const [panelMeasureRef, setPanelMeasureRef] = useState<HTMLDivElement | null>(null);
  const launcherRect = useSize(launcherMeasureRef);
  const panelRect = useSize(panelMeasureRef);
  const rc = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const style = computePositionStyle(
    resourceCenterPlacementToPosition(rc?.placement ?? 'bottom-right'),
    rc?.offsetX ?? 20,
    rc?.offsetY ?? 20,
  );
  const closedHeight = launcher?.height ?? 60;
  const closedWidth = closedWidthOverride
    ? `${closedWidthOverride}px`
    : launcherRect?.width
      ? `${launcherRect.width}px`
      : `${closedHeight}px`;
  const openWidth = `${rc?.normalWidth ?? 360}px`;
  const openHeight = openHeightOverride
    ? `${openHeightOverride}px`
    : panelRect?.height
      ? `${panelRect.height}px`
      : undefined;

  return (
    <ResourceCenterAnchor
      ref={ref}
      style={{
        zIndex,
        ...style,
      }}
      anchor={!isOpen ? <ResourceCenterBadge count={badgeCount ?? 0} /> : undefined}
      {...restProps}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed opacity-0"
        style={{
          left: '-10000px',
          top: '-10000px',
          width: openWidth,
        }}
      >
        <div ref={setLauncherMeasureRef} className="inline-block">
          <ResourceCenterLauncherContent badgeCount={badgeCount} launcherText={launcherText} />
        </div>
        <div ref={setPanelMeasureRef}>
          <ResourceCenterContent>{children}</ResourceCenterContent>
        </div>
      </div>
      <div className="usertour-widget-resource-center-frame-wrapper">
        <div
          className={getResourceCenterFrameClassName(isOpen, isAnimating)}
          style={{
            width: isOpen ? openWidth : closedWidth,
            height: isOpen ? openHeight : `${closedHeight}px`,
            borderWidth: isOpen ? 'var(--usertour-widget-popper-border-width)' : '0px',
            borderStyle: isOpen ? 'solid' : 'none',
            borderColor: isOpen ? 'var(--usertour-widget-popper-border-color)' : 'transparent',
          }}
          role={isOpen ? 'dialog' : undefined}
        >
          <ResourceCenterFrameRoot launcherText={launcherText} isAnimating={isAnimating}>
            {children}
          </ResourceCenterFrameRoot>
        </div>
      </div>
    </ResourceCenterAnchor>
  );
});

ResourceCenter.displayName = 'ResourceCenter';

// ============================================================================
// Popper with iframe (like ChecklistPopperUseIframe)
// ============================================================================

const ResourceCenterFrame = forwardRef<
  HTMLIFrameElement,
  ResourceCenterProps & {
    assets?: AssetAttributes[];
  }
>((props, ref) => {
  const { children, assets, badgeCount, launcherText, openHeightOverride, closedWidthOverride } =
    props;
  const { globalStyle, themeSetting, zIndex, isOpen, isAnimating } = useResourceCenterRootContext();
  const [launcherMeasureRef, setLauncherMeasureRef] = useState<HTMLDivElement | null>(null);
  const [panelMeasureRef, setPanelMeasureRef] = useState<HTMLDivElement | null>(null);
  const launcherRect = useSize(launcherMeasureRef);
  const panelRect = useSize(panelMeasureRef);
  const rc = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const style = computePositionStyle(
    resourceCenterPlacementToPosition(rc?.placement ?? 'bottom-right'),
    rc?.offsetX ?? 20,
    rc?.offsetY ?? 20,
  );
  const closedHeight = launcher?.height ?? 60;
  const openWidth = `${rc?.normalWidth ?? 360}px`;
  const closedWidth = closedWidthOverride
    ? `${closedWidthOverride}px`
    : launcherRect?.width
      ? `${launcherRect.width}px`
      : `${closedHeight}px`;
  const openHeight = openHeightOverride
    ? `${openHeightOverride}px`
    : panelRect?.height
      ? `${panelRect.height}px`
      : undefined;

  return (
    <ResourceCenterAnchor
      style={{
        zIndex,
        ...style,
      }}
      anchor={!isOpen ? <ResourceCenterBadge count={badgeCount ?? 0} /> : undefined}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed opacity-0"
        style={{
          left: '-10000px',
          top: '-10000px',
          width: openWidth,
        }}
      >
        <div ref={setLauncherMeasureRef} className="inline-block">
          <ResourceCenterLauncherContent badgeCount={badgeCount} launcherText={launcherText} />
        </div>
        <div ref={setPanelMeasureRef}>
          <ResourceCenterContent>{children}</ResourceCenterContent>
        </div>
      </div>
      <div className="usertour-widget-resource-center-frame-wrapper">
        <Frame
          assets={assets}
          ref={ref}
          className={getResourceCenterFrameClassName(isOpen, isAnimating)}
          defaultStyle={{
            width: isOpen ? openWidth : closedWidth,
            height: isOpen ? openHeight : `${closedHeight}px`,
            borderWidth: isOpen ? 'var(--usertour-widget-popper-border-width)' : '0px',
            borderStyle: isOpen ? 'solid' : 'none',
            borderColor: isOpen ? 'var(--usertour-widget-popper-border-color)' : 'transparent',
          }}
        >
          <ResourceCenterFrameContent
            globalStyle={globalStyle}
            launcherText={launcherText}
            isAnimating={isAnimating}
          >
            {children}
          </ResourceCenterFrameContent>
        </Frame>
      </div>
    </ResourceCenterAnchor>
  );
});

ResourceCenterFrame.displayName = 'ResourceCenterFrame';

interface ResourceCenterFrameContentProps {
  globalStyle?: string;
  children: React.ReactNode;
  launcherText?: string;
  isAnimating?: boolean;
}

const ResourceCenterFrameContent = forwardRef<HTMLDivElement, ResourceCenterFrameContentProps>(
  (props, _) => {
    const { globalStyle, launcherText, children, isAnimating = false } = props;
    const { document } = useFrame();

    useEffect(() => {
      if (globalStyle && document?.body) {
        document.body.style.cssText = globalStyle;
        document.body.className = 'usertour-widget-root';
      }
    }, [globalStyle, document]);

    return (
      <ResourceCenterFrameRoot launcherText={launcherText} isAnimating={isAnimating}>
        <ResourceCenterContent>{children}</ResourceCenterContent>
      </ResourceCenterFrameRoot>
    );
  },
);

ResourceCenterFrameContent.displayName = 'ResourceCenterFrameContent';

// ============================================================================
// Static Popper (like ChecklistStaticPopper — for previews)
// ============================================================================

const ResourceCenterStatic = forwardRef<
  HTMLDivElement,
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onClick'> & ResourceCenterProps
>((props, ref) => {
  const {
    children,
    badgeCount,
    launcherText,
    openHeightOverride,
    closedWidthOverride,
    ...restProps
  } = props;
  const { themeSetting, isOpen, isAnimating } = useResourceCenterRootContext();
  const [panelMeasureRef, setPanelMeasureRef] = useState<HTMLDivElement | null>(null);
  const [launcherMeasureRef, setLauncherMeasureRef] = useState<HTMLDivElement | null>(null);
  const panelMeasureRect = useSize(panelMeasureRef);
  const launcherMeasureRect = useSize(launcherMeasureRef);
  const rc = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const closedHeight = launcher?.height ?? 60;
  const openWidth = `${rc?.normalWidth ?? 360}px`;

  return (
    <ResourceCenterAnchor
      ref={ref}
      anchor={!isOpen ? <ResourceCenterBadge count={badgeCount ?? 0} /> : undefined}
      {...restProps}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed opacity-0"
        style={{
          left: '-10000px',
          top: '-10000px',
          width: openWidth,
        }}
      >
        <div ref={setLauncherMeasureRef} className="inline-block">
          <ResourceCenterLauncherContent badgeCount={badgeCount} launcherText={launcherText} />
        </div>
        <div ref={setPanelMeasureRef}>
          <ResourceCenterContent>{children}</ResourceCenterContent>
        </div>
      </div>
      <div className="usertour-widget-resource-center-frame-wrapper">
        <div
          className={getResourceCenterFrameClassName(isOpen, isAnimating)}
          style={{
            width: isOpen
              ? openWidth
              : `${closedWidthOverride ?? launcherMeasureRect?.width ?? closedHeight}px`,
            height: isOpen
              ? `${openHeightOverride ?? panelMeasureRect?.height ?? closedHeight}px`
              : `${closedHeight}px`,
            borderWidth: isOpen ? 'var(--usertour-widget-popper-border-width)' : '0px',
            borderStyle: isOpen ? 'solid' : 'none',
            borderColor: isOpen ? 'var(--usertour-widget-popper-border-color)' : 'transparent',
          }}
          role={isOpen ? 'dialog' : undefined}
        >
          <ResourceCenterFrameRoot launcherText={launcherText} isAnimating={isAnimating}>
            {children}
          </ResourceCenterFrameRoot>
        </div>
      </div>
    </ResourceCenterAnchor>
  );
});

ResourceCenterStatic.displayName = 'ResourceCenterStatic';

// ============================================================================
// Popper Content (alias, like ChecklistPopperContent)
// ============================================================================

const ResourceCenterContent = forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        className="usertour-widget-resource-center-panel-content min-h-0 flex flex-col text-sdk-foreground"
      >
        {children}
      </div>
    );
  },
);
ResourceCenterContent.displayName = 'ResourceCenterContent';

// ============================================================================
// Header (brand-colored header bar with close button)
// ============================================================================

const ResourceCenterHeader = memo(({ text }: { text: string }) => {
  return (
    <div className="usertour-widget-resource-center-header bg-sdk-resource-center-header-background shrink-0">
      <div className="usertour-widget-resource-center-header-content px-3 py-2 flex items-center">
        <div className="text-sdk-resource-center-header-foreground font-semibold text-base flex-1">
          {text}
        </div>
        <ResourceCenterDropdown />
      </div>
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';

// ============================================================================
// Dropdown close button (like ChecklistDropdown)
// ============================================================================

const ResourceCenterDropdown = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { handleExpandedChange } = useResourceCenterRootContext();
  const { className, ...restProps } = props;

  const buttonClassName = cn(
    'size-6 rounded',
    'inline-flex items-center justify-center',
    'text-sdk-resource-center-header-foreground',
    'hover:bg-sdk-resource-center-header-foreground/10',
    'outline-none cursor-pointer',
    className,
  );

  const handleClick = useCallback(async () => {
    await handleExpandedChange(false);
  }, [handleExpandedChange]);

  return (
    <Button
      variant="custom"
      ref={ref}
      className={buttonClassName}
      onClick={handleClick}
      aria-label="Close resource center"
      {...restProps}
    >
      <DropDownIcon height={24} width={24} />
    </Button>
  );
});

ResourceCenterDropdown.displayName = 'ResourceCenterDropdown';

// ============================================================================
// Block — MESSAGE
// ============================================================================

interface ResourceCenterMessageBlockViewProps {
  block: ResourceCenterMessageBlock;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  editSlot?: React.ReactNode;
}

const ResourceCenterMessageBlockView = memo(
  ({ block, userAttributes, onContentClick, editSlot }: ResourceCenterMessageBlockViewProps) => {
    if (editSlot) {
      return <div className="py-2 px-4">{editSlot}</div>;
    }

    return (
      <div className="py-2 px-4">
        <ContentEditorSerialize
          contents={block.content}
          onClick={onContentClick}
          userAttributes={userAttributes}
        />
      </div>
    );
  },
);

ResourceCenterMessageBlockView.displayName = 'ResourceCenterMessageBlockView';

// ============================================================================
// Block — CHECKLIST (slot)
// ============================================================================

interface ResourceCenterChecklistBlockViewProps {
  slot?: React.ReactNode;
}

const ResourceCenterChecklistBlockView = memo(({ slot }: ResourceCenterChecklistBlockViewProps) => {
  if (slot) {
    return <div className="px-4 py-2">{slot}</div>;
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 text-sm opacity-50">
        <span>📋</span>
        <span>No active checklist</span>
      </div>
    </div>
  );
});

ResourceCenterChecklistBlockView.displayName = 'ResourceCenterChecklistBlockView';

// ============================================================================
// Body
// ============================================================================

const ResourceCenterBody = memo(({ children }: { children: React.ReactNode }) => {
  const { themeSetting } = useResourceCenterRootContext();
  const rc = themeSetting.resourceCenter;

  return (
    <div
      className="usertour-widget-resource-center-body min-h-0 min-w-0 flex-1 overflow-y-auto bg-sdk-background"
      style={{
        maxHeight: rc?.maxHeight ? `${rc.maxHeight}px` : undefined,
      }}
    >
      <div className="usertour-widget-resource-center-body-content">{children}</div>
    </div>
  );
});

ResourceCenterBody.displayName = 'ResourceCenterBody';

// ============================================================================
// Blocks — renders all blocks with dividers
// ============================================================================

interface ResourceCenterBlocksProps {
  messageEditSlots?: Record<string, React.ReactNode>;
}

const ResourceCenterBlocks = memo(({ messageEditSlots }: ResourceCenterBlocksProps) => {
  const { themeSetting, data, userAttributes, onContentClick, checklistSlot } =
    useResourceCenterRootContext();

  const rc = themeSetting.resourceCenter;
  const showDividers = rc?.dividerLines !== false;

  return (
    <>
      {data.blocks.map((block, index) => {
        const showDivider = showDividers && index < data.blocks.length - 1;

        return (
          <div key={block.id}>
            {block.type === ResourceCenterBlockType.MESSAGE && (
              <ResourceCenterMessageBlockView
                block={block}
                userAttributes={userAttributes}
                onContentClick={onContentClick}
                editSlot={messageEditSlots?.[block.id]}
              />
            )}
            {block.type === ResourceCenterBlockType.CHECKLIST && (
              <ResourceCenterChecklistBlockView slot={checklistSlot} />
            )}
            {showDivider && <div className="mx-4 border-b border-sdk-resource-center-divider" />}
          </div>
        );
      })}

      {data.blocks.length === 0 && (
        <div className="py-8 text-center text-sm opacity-40">No blocks added yet</div>
      )}
    </>
  );
});

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';

// ============================================================================
// Footer (MadeWith)
// ============================================================================

const ResourceCenterFooter = memo(() => {
  const { showMadeWith } = useResourceCenterRootContext();
  if (!showMadeWith) return null;
  return (
    <div className="usertour-widget-resource-center-footer bg-sdk-background">
      <div className="usertour-widget-resource-center-footer-content text-xs opacity-50 hover:opacity-75">
        <a
          href="https://www.usertour.io?utm_source=made-with-usertour&utm_medium=link&utm_campaign=made-with-usertour-widget"
          className="!text-sdk-foreground !no-underline flex flex-row space-x-0.5 items-center !font-sans"
          target="_blank"
          rel="noopener noreferrer"
        >
          <UsertourIcon width={14} height={14} />
          <span>Made with Usertour</span>
        </a>
      </div>
    </div>
  );
});

ResourceCenterFooter.displayName = 'ResourceCenterFooter';

// ============================================================================
// Exports
// ============================================================================

export {
  ResourceCenterRoot,
  ResourceCenterContainer,
  ResourceCenterLauncher,
  ResourceCenterLauncherContent,
  ResourceCenterLauncherIcon,
  ResourceCenterLauncherFrame,
  ResourceCenter,
  ResourceCenterFrame,
  ResourceCenterContent,
  ResourceCenterStatic,
  ResourceCenterHeader,
  ResourceCenterDropdown,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterMessageBlockView,
  ResourceCenterChecklistBlockView,
  ResourceCenterBadge,
  ResourceCenterFooter,
  ResourceCenterFrameContent,
  useResourceCenterRootContext,
};
