import { forwardRef, useEffect, type HTMLAttributes } from 'react';
import type { AssetAttributes } from '@usertour-packages/frame';
import { Frame, useFrame } from '@usertour-packages/frame';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import { useResourceCenterDimensions } from './hooks/use-resource-center-dimensions';
import { useResourceCenterPositionStyle } from './hooks/use-resource-center-position-style';
import { ResourceCenterAnchor } from './resource-center-anchor';
import { ResourceCenterBadge } from './resource-center-trigger';
import { ResourceCenterTrigger } from './resource-center-trigger';
import { ResourceCenterFrameRoot } from './resource-center-frame-root';

// ============================================================================
// Hidden Measurement (outside iframe — uses CSS class, no tailwind)
// ============================================================================

interface HiddenMeasurementProps {
  openWidth: string;
  setLauncherMeasureRef: (el: HTMLDivElement | null) => void;
  setPanelMeasureRef: (el: HTMLDivElement | null) => void;
  badgeCount?: number;
  launcherText?: string;
  children?: React.ReactNode;
}

const HiddenMeasurement = ({
  openWidth,
  setLauncherMeasureRef,
  setPanelMeasureRef,
  badgeCount,
  launcherText,
  children,
}: HiddenMeasurementProps) => (
  <div
    aria-hidden="true"
    className="usertour-widget-resource-center-hidden-measurement"
    style={{ width: openWidth }}
  >
    <div
      ref={setLauncherMeasureRef}
      className="usertour-widget-resource-center-hidden-measurement-inline"
    >
      <ResourceCenterTrigger badgeCount={badgeCount} launcherText={launcherText} />
    </div>
    <div ref={setPanelMeasureRef}>{children}</div>
  </div>
);

// ============================================================================
// Frame class name helper (outside iframe — uses CSS class)
// ============================================================================

const getFrameClassName = (isOpen: boolean, isAnimating: boolean) =>
  cn(
    'usertour-widget-resource-center-frame',
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
}

const IFrameContent = ({
  globalStyle,
  launcherText,
  children,
  isAnimating = false,
}: IFrameContentProps) => {
  const { document } = useFrame();

  useEffect(() => {
    if (globalStyle && document?.body) {
      document.body.style.cssText = globalStyle;
      document.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, document]);

  return (
    <ResourceCenterFrameRoot launcherText={launcherText} isAnimating={isAnimating}>
      {children}
    </ResourceCenterFrameRoot>
  );
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

  const { globalStyle, zIndex, isOpen, isAnimating } = useResourceCenterContext();
  const positionStyle = mode !== 'preview' ? useResourceCenterPositionStyle() : undefined;
  const {
    setLauncherMeasureRef,
    setPanelMeasureRef,
    closedHeight,
    closedWidth,
    openWidth,
    openHeight,
  } = useResourceCenterDimensions({ closedWidthOverride, openHeightOverride });

  const outerStyle: React.CSSProperties = {
    ...(mode !== 'preview' ? { zIndex, ...positionStyle } : {}),
  };

  const frameSizeStyle = {
    width: isOpen ? openWidth : closedWidth,
    height: isOpen ? openHeight : `${closedHeight}px`,
    ...getFrameBorderStyle(isOpen),
  };

  const frameClassName = getFrameClassName(isOpen, isAnimating);

  const innerContent = (
    <ResourceCenterFrameRoot launcherText={launcherText} isAnimating={isAnimating}>
      {children}
    </ResourceCenterFrameRoot>
  );

  return (
    <ResourceCenterAnchor
      ref={ref as React.Ref<HTMLDivElement>}
      style={outerStyle}
      anchor={!isOpen ? <ResourceCenterBadge count={badgeCount ?? 0} /> : undefined}
      {...restProps}
    >
      <HiddenMeasurement
        openWidth={openWidth}
        setLauncherMeasureRef={setLauncherMeasureRef}
        setPanelMeasureRef={setPanelMeasureRef}
        badgeCount={badgeCount}
        launcherText={launcherText}
      >
        {children}
      </HiddenMeasurement>

      <div className="usertour-widget-resource-center-frame-wrapper">
        {mode === 'iframe' ? (
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
            >
              {children}
            </IFrameContent>
          </Frame>
        ) : (
          <div
            className={frameClassName}
            style={frameSizeStyle}
            role={isOpen ? 'dialog' : undefined}
          >
            {innerContent}
          </div>
        )}
      </div>
    </ResourceCenterAnchor>
  );
});

ResourceCenterPanel.displayName = 'ResourceCenterPanel';
