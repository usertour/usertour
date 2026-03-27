import { useState } from 'react';
import { useSize } from '@usertour-packages/react-use-size';
import { useResourceCenterContext } from '../context';
import { RC_DEFAULTS } from '../constants';

interface UseResourceCenterDimensionsOptions {
  closedWidthOverride?: number;
  openHeightOverride?: number;
}

export function useResourceCenterDimensions(opts: UseResourceCenterDimensionsOptions = {}) {
  const { closedWidthOverride, openHeightOverride } = opts;
  const { themeSetting } = useResourceCenterContext();

  const [launcherMeasureRef, setLauncherMeasureRef] = useState<HTMLDivElement | null>(null);
  const [panelMeasureRef, setPanelMeasureRef] = useState<HTMLDivElement | null>(null);
  const launcherRect = useSize(launcherMeasureRef);
  const panelRect = useSize(panelMeasureRef);

  const rc = themeSetting.resourceCenter;
  const launcher = themeSetting.resourceCenterLauncherButton;
  const closedHeight = launcher?.height ?? RC_DEFAULTS.launcherHeight;
  const openWidth = `${rc?.normalWidth ?? RC_DEFAULTS.normalWidth}px`;

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

  return {
    setLauncherMeasureRef,
    setPanelMeasureRef,
    closedHeight,
    closedWidth,
    openWidth,
    openHeight,
    rc,
    launcher,
  };
}
