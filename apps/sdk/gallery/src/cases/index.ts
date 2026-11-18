import { bannerCases } from './banner';
import { checklistCases } from './checklist';
import { embedCases } from './embed';
import { flowCases } from './flow';
import { launcherCases } from './launcher';
import { resourceCenterCases } from './resource-center';
import type { GalleryCase } from './types';

export const cases: Record<string, GalleryCase> = {
  ...flowCases,
  ...checklistCases,
  ...launcherCases,
  ...bannerCases,
  ...embedCases,
  ...resourceCenterCases,
};
