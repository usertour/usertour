import { forwardRef, useState } from 'react';
import type { AssetAttributes } from '@usertour-packages/frame';
import { Frame } from '@usertour-packages/frame';
import { useResourceCenterContext } from './context';
import { RC_DEFAULTS, resourceCenterPlacementToPosition } from './constants';
import { computePositionStyle } from '../utils/position';
import { ResourceCenterTrigger } from './resource-center-trigger';
import { useFrameGlobalStyle } from './hooks/use-frame-global-style';

// ============================================================================
// Launcher (fixed position DOM wrapper)
// ============================================================================

interface ResourceCenterLauncherProps {
  badgeCount?: number;
  launcherText?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  frameStyle?: React.CSSProperties;
}

export const ResourceCenterLauncher = forwardRef<HTMLDivElement, ResourceCenterLauncherProps>(
  (props, ref) => {
    const { onClick, badgeCount, launcherText, style, frameStyle } = props;
    const { themeSetting, zIndex } = useResourceCenterContext();
    const rc = themeSetting.resourceCenter;
    const launcher = themeSetting.resourceCenterLauncherButton;
    const positionStyle = computePositionStyle(
      resourceCenterPlacementToPosition(rc?.placement ?? RC_DEFAULTS.placement),
      rc?.offsetX ?? RC_DEFAULTS.offsetX,
      rc?.offsetY ?? RC_DEFAULTS.offsetY,
    );

    return (
      <div
        ref={ref}
        className="usertour-widget-resource-center-launcher"
        style={{
          zIndex,
          ...positionStyle,
          height: launcher?.height ?? RC_DEFAULTS.launcherHeight,
          borderRadius: launcher?.borderRadius,
          ...style,
          ...frameStyle,
        }}
      >
        <ResourceCenterTrigger
          onClick={onClick}
          badgeCount={badgeCount}
          launcherText={launcherText}
        />
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
  badgeCount?: number;
  launcherText?: string;
}

export const ResourceCenterLauncherFrame = forwardRef<
  HTMLIFrameElement,
  ResourceCenterLauncherFrameProps
>((props, ref) => {
  const { assets, badgeCount, launcherText } = props;
  const { globalStyle, themeSetting, zIndex } = useResourceCenterContext();
  const [launcherRect, setLauncherRect] = useState<{ width: number; height: number } | null>(null);

  const rc = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const style = computePositionStyle(
    resourceCenterPlacementToPosition(rc?.placement ?? RC_DEFAULTS.placement),
    rc?.offsetX ?? RC_DEFAULTS.offsetX,
    rc?.offsetY ?? RC_DEFAULTS.offsetY,
  );
  const width = launcherRect?.width ? `${launcherRect.width}px` : undefined;

  return (
    <Frame
      assets={assets}
      ref={ref}
      className="usertour-widget-resource-center-launcher"
      defaultStyle={{
        zIndex,
        ...style,
        width,
        height: launcher?.height ?? RC_DEFAULTS.launcherHeight,
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
  );
});

ResourceCenterLauncherFrame.displayName = 'ResourceCenterLauncherFrame';

// ============================================================================
// Launcher In Frame (iframe inner content)
// ============================================================================

interface ResourceCenterLauncherInFrameProps {
  globalStyle?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  badgeCount?: number;
  launcherText?: string;
}

const ResourceCenterLauncherInFrame = (props: ResourceCenterLauncherInFrameProps) => {
  const { globalStyle, onSizeChange, badgeCount, launcherText } = props;
  const { handleExpandedChange } = useResourceCenterContext();

  useFrameGlobalStyle(globalStyle);

  return (
    <ResourceCenterTrigger
      onClick={async () => await handleExpandedChange(true)}
      onSizeChange={onSizeChange}
      badgeCount={badgeCount}
      launcherText={launcherText}
    />
  );
};

ResourceCenterLauncherInFrame.displayName = 'ResourceCenterLauncherInFrame';
