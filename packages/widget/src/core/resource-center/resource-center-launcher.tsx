import { forwardRef, useState } from 'react';
import type { AssetAttributes } from '@usertour-packages/frame';
import { Frame } from '@usertour-packages/frame';
import { useResourceCenterContext } from './context';
import { RESOURCE_CENTER_DEFAULTS, resourceCenterPlacementToPosition } from './constants';
import { computePositionStyle } from '../utils/position';
import { ResourceCenterTrigger } from './resource-center-trigger';
import { useFrameGlobalStyle } from './hooks/use-frame-global-style';
import { WidgetClass } from '../class-names';

const getLauncherBorderRadius = (
  borderRadius: number | null | undefined,
  height: number,
): React.CSSProperties['borderRadius'] => (borderRadius == null ? `${height / 2}px` : borderRadius);

// ============================================================================
// Launcher (fixed position DOM wrapper)
// ============================================================================

interface ResourceCenterLauncherProps {
  onClick?: () => void;
  style?: React.CSSProperties;
  frameStyle?: React.CSSProperties;
}

export const ResourceCenterLauncher = forwardRef<HTMLDivElement, ResourceCenterLauncherProps>(
  (props, ref) => {
    const { onClick, style, frameStyle } = props;
    const { themeSetting, zIndex } = useResourceCenterContext();
    const resourceCenter = themeSetting.resourceCenter;
    const launcher = themeSetting.resourceCenterLauncherButton;
    const launcherHeight = launcher?.height ?? RESOURCE_CENTER_DEFAULTS.launcherHeight;
    const positionStyle = computePositionStyle(
      resourceCenterPlacementToPosition(
        resourceCenter?.placement ?? RESOURCE_CENTER_DEFAULTS.placement,
      ),
      resourceCenter?.offsetX ?? RESOURCE_CENTER_DEFAULTS.offsetX,
      resourceCenter?.offsetY ?? RESOURCE_CENTER_DEFAULTS.offsetY,
    );

    return (
      <div
        ref={ref}
        className={`${WidgetClass.resourceCenterLauncher} ${WidgetClass.elevation}`}
        style={{
          zIndex,
          ...positionStyle,
          height: launcherHeight,
          borderRadius: getLauncherBorderRadius(launcher?.borderRadius, launcherHeight),
          ...style,
          ...frameStyle,
        }}
      >
        <ResourceCenterTrigger onClick={onClick} />
      </div>
    );
  },
);

ResourceCenterLauncher.displayName = 'ResourceCenterLauncher';

// ============================================================================
// Launcher Frame (iframe variant)
// ============================================================================

interface ResourceCenterLauncherFrameProps {
  assets: AssetAttributes[] | undefined;
}

export const ResourceCenterLauncherFrame = forwardRef<
  HTMLIFrameElement,
  ResourceCenterLauncherFrameProps
>((props, ref) => {
  const { assets } = props;
  const { globalStyle, themeSetting, zIndex } = useResourceCenterContext();
  const [launcherRect, setLauncherRect] = useState<{ width: number; height: number } | null>(null);

  const resourceCenter = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const launcherHeight = launcher?.height ?? RESOURCE_CENTER_DEFAULTS.launcherHeight;
  const style = computePositionStyle(
    resourceCenterPlacementToPosition(
      resourceCenter?.placement ?? RESOURCE_CENTER_DEFAULTS.placement,
    ),
    resourceCenter?.offsetX ?? RESOURCE_CENTER_DEFAULTS.offsetX,
    resourceCenter?.offsetY ?? RESOURCE_CENTER_DEFAULTS.offsetY,
  );
  const width = launcherRect?.width ? `${launcherRect.width}px` : undefined;

  return (
    <Frame
      assets={assets}
      ref={ref}
      className={`${WidgetClass.resourceCenterLauncher} ${WidgetClass.elevation}`}
      defaultStyle={{
        zIndex,
        ...style,
        width,
        height: launcherHeight,
        borderRadius: getLauncherBorderRadius(launcher?.borderRadius, launcherHeight),
      }}
    >
      <ResourceCenterLauncherInFrame globalStyle={globalStyle} onSizeChange={setLauncherRect} />
    </Frame>
  );
});

ResourceCenterLauncherFrame.displayName = 'ResourceCenterLauncherFrame';

// ============================================================================
// Launcher In Frame (iframe inner content)
// ============================================================================

interface ResourceCenterLauncherInFrameProps {
  globalStyle?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
}

const ResourceCenterLauncherInFrame = (props: ResourceCenterLauncherInFrameProps) => {
  const { globalStyle, onSizeChange } = props;
  const { handleExpandedChange } = useResourceCenterContext();

  useFrameGlobalStyle(globalStyle);

  return (
    <ResourceCenterTrigger
      onClick={async () => await handleExpandedChange(true)}
      onSizeChange={onSizeChange}
    />
  );
};

ResourceCenterLauncherInFrame.displayName = 'ResourceCenterLauncherInFrame';
