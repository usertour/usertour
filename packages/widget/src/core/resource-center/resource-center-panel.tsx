import { forwardRef, useCallback, useLayoutEffect, useState, type HTMLAttributes } from 'react';
import type { AssetAttributes } from '@usertour-packages/frame';
import { Frame, useFrame } from '@usertour-packages/frame';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import { RESOURCE_CENTER_DEFAULTS } from './constants';
import { useResourceCenterPositionStyle } from './hooks/use-resource-center-position-style';
import { ResourceCenterAnchor } from './resource-center-anchor';
import { ResourceCenterFrameRoot } from './resource-center-frame-root';
import { ResourceCenterBadge } from './resource-center-trigger';
import { useFrameGlobalStyle } from './hooks/use-frame-global-style';
import { WidgetClass } from '../class-names';

// ============================================================================
// Frame class name helper (outside iframe — uses CSS class)
// ============================================================================

const getFrameClassName = (isOpen: boolean, isAnimating: boolean) =>
  cn(
    `${WidgetClass.resourceCenterFrame} ${WidgetClass.elevation}`,
    isAnimating && WidgetClass.resourceCenterFrameResizing,
    isOpen ? WidgetClass.resourceCenterFrameExpanded : WidgetClass.resourceCenterFrameCompact,
  );

// ============================================================================
// Frame border style helper
// ============================================================================

const getFrameBorderStyle = (isOpen: boolean) => ({
  borderWidth: isOpen ? 'var(--usertour-widget-popper-border-width)' : '0px',
  borderStyle: isOpen ? ('solid' as const) : ('none' as const),
  borderColor: isOpen ? 'var(--usertour-widget-popper-border-color)' : 'transparent',
});

// ============================================================================
// iframe inner content (applies globalStyle to iframe body)
// ============================================================================

interface IFrameContentProps {
  globalStyle?: string;
  children: React.ReactNode;
  mode?: 'dom' | 'iframe';
  isAnimating?: boolean;
  onLauncherSizeChange?: (rect: { width: number; height: number }) => void;
}

const IFrameContent = ({
  globalStyle,
  children,
  mode,
  isAnimating = false,
  onLauncherSizeChange,
}: IFrameContentProps) => {
  const { document } = useFrame();

  useLayoutEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return (
    <ResourceCenterFrameRoot
      mode={mode}
      isAnimating={isAnimating}
      onLauncherSizeChange={onLauncherSizeChange}
    >
      {children}
    </ResourceCenterFrameRoot>
  );
};

// ============================================================================
// Badge iframe inner content
// ============================================================================

const BadgeFrameContent = ({
  globalStyle,
  count,
}: {
  globalStyle?: string;
  count: number;
}) => {
  useFrameGlobalStyle(globalStyle);
  return <ResourceCenterBadge count={count} />;
};

// ============================================================================
// ResourceCenterPanel — unified component (mode: dom | iframe)
// ============================================================================

interface ResourceCenterPanelProps {
  mode: 'dom' | 'iframe';
  /** Set to false to disable fixed positioning (e.g. theme preview) */
  position?: boolean;
  /** Allow content to overflow the frame (e.g. for builder editor toolbar) */
  allowOverflow?: boolean;
  children?: React.ReactNode;
  openHeightOverride?: number;
  closedWidthOverride?: number;
  assets?: AssetAttributes[];
}

type ResourceCenterPanelCombinedProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onClick'
> &
  ResourceCenterPanelProps;

export const ResourceCenterPanel = forwardRef<
  HTMLDivElement | HTMLIFrameElement,
  ResourceCenterPanelCombinedProps
>((props, ref) => {
  const {
    mode,
    position: positionProp,
    allowOverflow,
    children,
    openHeightOverride,
    closedWidthOverride,
    assets,
    ...restProps
  } = props;

  const {
    globalStyle,
    zIndex,
    isOpen,
    isAnimating,
    themeSetting,
    animateFrame,
    badgeCount,
    hidden,
    launcherHidden,
  } = useResourceCenterContext();
  const positionStyle = useResourceCenterPositionStyle();

  const resourceCenter = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const closedHeight = launcher?.height ?? RESOURCE_CENTER_DEFAULTS.launcherHeight;
  const openWidth = `${resourceCenter?.normalWidth ?? RESOURCE_CENTER_DEFAULTS.normalWidth}px`;
  const applyPosition = positionProp !== false;

  const [launcherSize, setLauncherSize] = useState<{ width: number; height: number } | null>(null);

  const onLauncherSizeChange = useCallback(
    (rect: { width: number; height: number }) => setLauncherSize(rect),
    [],
  );

  const closedWidth = closedWidthOverride
    ? `${closedWidthOverride}px`
    : launcherSize?.width
      ? `${launcherSize.width}px`
      : 'auto';

  // Fixed open height: calc(100vh - offset) capped at maxHeight
  const offsetY = resourceCenter?.offsetY ?? RESOURCE_CENTER_DEFAULTS.offsetY;
  const maxHeight = resourceCenter?.maxHeight ?? 700;
  const heightOffset = offsetY * 2 + closedHeight + 4;
  const useFixedHeight = positionProp !== false || openHeightOverride != null;
  const openFrameHeight = useFixedHeight
    ? openHeightOverride
      ? `${openHeightOverride}px`
      : `min(calc(100vh - ${heightOffset}px), ${maxHeight}px)`
    : 'auto';

  // Hide entire panel when launcher is hidden and resource center is closed
  const shouldHide = hidden || (launcherHidden && !isOpen);

  const outerStyle: React.CSSProperties = {
    ...(applyPosition ? { zIndex, ...positionStyle } : {}),
    ...(shouldHide ? { visibility: 'hidden' as const, pointerEvents: 'none' as const } : {}),
  };

  const frameSizeStyle = {
    width: isOpen ? openWidth : closedWidth,
    height: isOpen ? openFrameHeight : `${closedHeight}px`,
    ...getFrameBorderStyle(isOpen),
  };

  const frameClassName = cn(
    getFrameClassName(isOpen, isAnimating && animateFrame),
    allowOverflow && '!overflow-visible',
  );
  const shouldShowBadge = !isOpen && (badgeCount ?? 0) > 0;

  return (
    <ResourceCenterAnchor ref={ref as React.Ref<HTMLDivElement>} style={outerStyle} {...restProps}>
      {mode === 'iframe' ? (
        <>
          <Frame
            assets={assets}
            ref={ref as React.Ref<HTMLIFrameElement>}
            className={frameClassName}
            defaultStyle={frameSizeStyle}
          >
            <IFrameContent
              globalStyle={globalStyle}
              mode="iframe"
              isAnimating={isAnimating && animateFrame}
              onLauncherSizeChange={onLauncherSizeChange}
            >
              {children}
            </IFrameContent>
          </Frame>
          {shouldShowBadge && (
            <Frame
              assets={assets}
              className={`${WidgetClass.indicator} ${WidgetClass.elevation}`}
              defaultStyle={{ border: 'none' }}
            >
              <BadgeFrameContent globalStyle={globalStyle} count={badgeCount ?? 0} />
            </Frame>
          )}
        </>
      ) : (
        <>
          <div
            className={frameClassName}
            style={frameSizeStyle}
            role={isOpen ? 'dialog' : undefined}
          >
            <ResourceCenterFrameRoot
              mode="dom"
              isAnimating={isAnimating && animateFrame}
              onLauncherSizeChange={onLauncherSizeChange}
            >
              {children}
            </ResourceCenterFrameRoot>
          </div>
          {shouldShowBadge && (
            <div className={`${WidgetClass.indicator} ${WidgetClass.elevation}`}>
              <ResourceCenterBadge count={badgeCount ?? 0} />
            </div>
          )}
        </>
      )}
    </ResourceCenterAnchor>
  );
});

ResourceCenterPanel.displayName = 'ResourceCenterPanel';
