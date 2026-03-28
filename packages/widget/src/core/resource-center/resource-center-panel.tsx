import { forwardRef, useCallback, useEffect, useState, type HTMLAttributes } from 'react';
import type { AssetAttributes } from '@usertour-packages/frame';
import { Frame, useFrame } from '@usertour-packages/frame';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import { RC_DEFAULTS } from './constants';
import { useResourceCenterPositionStyle } from './hooks/use-resource-center-position-style';
import { ResourceCenterAnchor } from './resource-center-anchor';
import { ResourceCenterFrameRoot } from './resource-center-frame-root';
import { ResourceCenterBadge } from './resource-center-trigger';
import { useFrameGlobalStyle } from './hooks/use-frame-global-style';

// ============================================================================
// Frame class name helper (outside iframe — uses CSS class)
// ============================================================================

const getFrameClassName = (isOpen: boolean, isAnimating: boolean) =>
  cn(
    'usertour-widget-resource-center-frame usertour-widget-shadow',
    isAnimating && 'usertour-widget-resource-center-frame--animating',
    isOpen
      ? 'usertour-widget-resource-center-frame--open'
      : 'usertour-widget-resource-center-frame--closed',
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
  launcherText?: string;
  isAnimating?: boolean;
  onLauncherSizeChange?: (rect: { width: number; height: number }) => void;
  onContentSizeChange?: (rect: { width: number; height: number }) => void;
}

const IFrameContent = ({
  globalStyle,
  launcherText,
  children,
  isAnimating = false,
  onLauncherSizeChange,
  onContentSizeChange,
}: IFrameContentProps) => {
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return (
    <ResourceCenterFrameRoot
      launcherText={launcherText}
      isAnimating={isAnimating}
      onLauncherSizeChange={onLauncherSizeChange}
      onContentSizeChange={onContentSizeChange}
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
// ResourceCenterPanel — unified component (mode: dom | iframe | preview)
// ============================================================================

interface ResourceCenterPanelProps {
  mode: 'dom' | 'iframe' | 'preview';
  children?: React.ReactNode;
  badgeCount?: number;
  launcherText?: string;
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
    children,
    badgeCount,
    launcherText,
    openHeightOverride,
    closedWidthOverride,
    assets,
    ...restProps
  } = props;

  const { globalStyle, zIndex, isOpen, isAnimating, themeSetting } = useResourceCenterContext();
  const positionStyle = mode !== 'preview' ? useResourceCenterPositionStyle() : undefined;

  const rc = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const closedHeight = launcher?.height ?? RC_DEFAULTS.launcherHeight;
  const openWidth = `${rc?.normalWidth ?? RC_DEFAULTS.normalWidth}px`;

  const [launcherSize, setLauncherSize] = useState<{ width: number; height: number } | null>(null);
  const [contentSize, setContentSize] = useState<{ width: number; height: number } | null>(null);

  const onLauncherSizeChange = useCallback(
    (rect: { width: number; height: number }) => setLauncherSize(rect),
    [],
  );
  const onContentSizeChange = useCallback(
    (rect: { width: number; height: number }) => setContentSize(rect),
    [],
  );

  const closedWidth = closedWidthOverride
    ? `${closedWidthOverride}px`
    : launcherSize?.width
      ? `${launcherSize.width}px`
      : `${closedHeight}px`;

  const openHeight = openHeightOverride
    ? `${openHeightOverride}px`
    : contentSize?.height
      ? `${contentSize.height}px`
      : undefined;

  const outerStyle: React.CSSProperties = {
    ...(mode !== 'preview' ? { zIndex, ...positionStyle } : {}),
  };

  const frameSizeStyle = {
    width: isOpen ? openWidth : closedWidth,
    height: isOpen ? openHeight : `${closedHeight}px`,
    ...getFrameBorderStyle(isOpen),
  };

  const frameClassName = getFrameClassName(isOpen, isAnimating);

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
              launcherText={launcherText}
              isAnimating={isAnimating}
              onLauncherSizeChange={onLauncherSizeChange}
              onContentSizeChange={onContentSizeChange}
            >
              {children}
            </IFrameContent>
          </Frame>
          {!isOpen && (
            <Frame
              assets={assets}
              className="usertour-widget-resource-center-launcher-unread-badge usertour-widget-shadow"
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
              launcherText={launcherText}
              isAnimating={isAnimating}
              onLauncherSizeChange={onLauncherSizeChange}
              onContentSizeChange={onContentSizeChange}
            >
              {children}
            </ResourceCenterFrameRoot>
          </div>
          {!isOpen && (
            <div className="usertour-widget-resource-center-launcher-unread-badge usertour-widget-shadow">
              <ResourceCenterBadge count={badgeCount ?? 0} />
            </div>
          )}
        </>
      )}
    </ResourceCenterAnchor>
  );
});

ResourceCenterPanel.displayName = 'ResourceCenterPanel';
