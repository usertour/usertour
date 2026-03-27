import { useMemo } from 'react';
import { useResourceCenterContext } from '../context';
import { RC_DEFAULTS, resourceCenterPlacementToPosition } from '../constants';
import { computePositionStyle } from '../../utils/position';

export function useResourceCenterPositionStyle() {
  const { themeSetting } = useResourceCenterContext();
  const rc = themeSetting.resourceCenter;

  return useMemo(
    () =>
      computePositionStyle(
        resourceCenterPlacementToPosition(rc?.placement ?? RC_DEFAULTS.placement),
        rc?.offsetX ?? RC_DEFAULTS.offsetX,
        rc?.offsetY ?? RC_DEFAULTS.offsetY,
      ),
    [rc?.placement, rc?.offsetX, rc?.offsetY],
  );
}
