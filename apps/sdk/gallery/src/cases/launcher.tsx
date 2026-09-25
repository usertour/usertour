import { LauncherWidget } from '@/components/launcher';
import { buildLauncherSnapshot, createFakeLauncher } from '../fake/launcher';
import type { LauncherData, ThemeTypesSetting } from '@usertour/types';
import { hoverLauncher, iconLauncher } from '../fixtures/launcher';
import { CenteredTarget } from './hosts';
import { type CaseParams, type GalleryCase, findTarget } from './types';

const launcherWidget =
  (
    data: LauncherData,
    themed: (theme: ThemeTypesSetting) => ThemeTypesSetting = (theme) => theme,
  ) =>
  ({ theme }: CaseParams) => {
    const { launcher } = createFakeLauncher(
      buildLauncherSnapshot({ data, theme: themed(theme), triggerRef: findTarget() }),
    );
    return <LauncherWidget launcher={launcher} />;
  };

/** The icon launcher at half opacity. */
const dimIcon = (theme: ThemeTypesSetting): ThemeTypesSetting => ({
  ...theme,
  launcherIcon: { ...theme.launcherIcon, opacity: 50 },
});

export const launcherCases: Record<string, GalleryCase> = {
  'launcher-icon': { host: CenteredTarget, widget: launcherWidget(iconLauncher) },
  'launcher-hover': { host: CenteredTarget, widget: launcherWidget(hoverLauncher) },
  'launcher-icon-dimmed': { host: CenteredTarget, widget: launcherWidget(iconLauncher, dimIcon) },
};
