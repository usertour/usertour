import type { ResourceCenterPlacement } from '@usertour/types';

export const RESOURCE_CENTER_DEFAULTS = {
  launcherHeight: 60,
  offsetX: 20,
  offsetY: 20,
  placement: 'bottom-right' as ResourceCenterPlacement,
  normalWidth: 360,
  imageHeight: 28,
  transitionDuration: 450,
} as const;

const PLACEMENT_TO_POSITION: Record<ResourceCenterPlacement, string> = {
  'top-left': 'leftTop',
  'top-right': 'rightTop',
  'bottom-left': 'leftBottom',
  'bottom-right': 'rightBottom',
};

export const resourceCenterPlacementToPosition = (placement: ResourceCenterPlacement): string =>
  PLACEMENT_TO_POSITION[placement] ?? PLACEMENT_TO_POSITION[RESOURCE_CENTER_DEFAULTS.placement];
