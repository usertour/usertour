import { WidgetZIndex } from '@usertour/constants';
import type { LauncherData, ThemeTypesSetting } from '@usertour/types';
import type { UsertourLauncher } from '@/core/usertour-launcher';
import type { LauncherStore } from '@/types/store';
import { ExternalStore } from '@/utils/store';
import { recordCall } from '../calls';
import { BASE_Z_INDEX, buildBaseSnapshot } from './base';

/** The slice of UsertourLauncher that LauncherWidget touches. */
type LauncherSurface = Pick<
  UsertourLauncher,
  | 'subscribe'
  | 'getSnapshot'
  | 'handleActivate'
  | 'handleActions'
  | 'handleOnClick'
  | 'onTooltipClose'
>;

type LauncherSnapshotInput = {
  data: LauncherData;
  theme: ThemeTypesSetting;
  triggerRef: Element | null;
};

/** The store UsertourLauncher holds once its target is found (getZIndex honours data.zIndex). */
export const buildLauncherSnapshot = (input: LauncherSnapshotInput): LauncherStore => {
  const { data, theme, triggerRef } = input;
  const zIndex = data.zIndex ?? BASE_Z_INDEX + WidgetZIndex.LAUNCHER_OFFSET;
  return { ...buildBaseSnapshot(theme, zIndex), launcherData: data, triggerRef };
};

/** A stand-in UsertourLauncher. Open/close state lives in the widget itself, so every handler only records. */
export const createFakeLauncher = (snapshot: LauncherStore) => {
  const store = new ExternalStore<LauncherStore>(snapshot);
  const surface: LauncherSurface = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    handleActivate: async () => recordCall('launcher.handleActivate'),
    handleActions: async (actions) => recordCall('launcher.handleActions', actions),
    handleOnClick: async (element) => recordCall('launcher.handleOnClick', element),
    onTooltipClose: async () => recordCall('launcher.onTooltipClose'),
  };
  return { launcher: surface as UsertourLauncher, store };
};
