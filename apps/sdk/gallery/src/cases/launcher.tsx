import { LauncherWidget } from '@/components/launcher';
import { buildLauncherSnapshot, createFakeLauncher } from '../fake/launcher';
import { iconLauncher } from '../fixtures/launcher';
import { defaultTheme } from '../fixtures/theme';
import { CenteredTarget } from './hosts';
import { type GalleryCase, findTarget } from './types';

const launcherWidget = () => {
  const { launcher } = createFakeLauncher(
    buildLauncherSnapshot({ data: iconLauncher, theme: defaultTheme, triggerRef: findTarget() }),
  );
  return <LauncherWidget launcher={launcher} />;
};

export const launcherCases: Record<string, GalleryCase> = {
  'launcher-icon': { host: CenteredTarget, widget: launcherWidget },
};
