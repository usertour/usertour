import { useMemo } from 'react';
import { useResourceCenterContext } from '../context';
import { RESOURCE_CENTER_DEFAULTS, resourceCenterPlacementToPosition } from '../constants';
import { computePositionStyle } from '../../utils/position';

export function useResourceCenterPositionStyle() {
  const { themeSetting } = useResourceCenterContext();
  const resourceCenter = themeSetting.resourceCenter;

  return useMemo(
    () =>
      computePositionStyle(
        resourceCenterPlacementToPosition(
          resourceCenter?.placement ?? RESOURCE_CENTER_DEFAULTS.placement,
        ),
        resourceCenter?.offsetX ?? RESOURCE_CENTER_DEFAULTS.offsetX,
        resourceCenter?.offsetY ?? RESOURCE_CENTER_DEFAULTS.offsetY,
      ),
    [resourceCenter?.placement, resourceCenter?.offsetX, resourceCenter?.offsetY],
  );
}
