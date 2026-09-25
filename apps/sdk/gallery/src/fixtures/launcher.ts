import { DEFAULT_LAUNCHER_DATA } from '@usertour/constants';
import type { LauncherData } from '@usertour/types';
import { textAndButton } from './content';

/** The builder's default launcher (a click-to-open icon on the target) with tooltip copy. */
export const iconLauncher: LauncherData = {
  ...DEFAULT_LAUNCHER_DATA,
  tooltip: { ...DEFAULT_LAUNCHER_DATA.tooltip, content: textAndButton },
};
