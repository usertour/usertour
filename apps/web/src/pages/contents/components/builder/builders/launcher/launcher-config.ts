import type { LauncherData } from '@usertour/types';
import type { BuilderTypeConfig } from '@/pages/contents/components/builder/core/builder-type-config';
import { defaultLauncherData } from '@/pages/contents/components/builder/utils/default-data';

// Launcher has two per-type UI buffers — the in-flight `tooltip` and
// `target` drafts the user is editing in the sub-modes — so TUIState
// is a struct rather than a single value. Each sub-mode reads /
// writes one slot via the use-launcher-editor helpers.

export interface LauncherUIState {
  tooltip: LauncherData['tooltip'] | undefined;
  target: LauncherData['target'] | undefined;
}

// Launcher's server payload is already fully populated by V1's
// initial-create flow (defaults baked at creation), so normalize is a
// straight fallback to defaultLauncherData when data is missing.
// Unlike Banner / Checklist there's no per-field merge — the legacy
// LauncherProvider also just did `currentVersion.data || defaultLauncherData`.

export const launcherTypeConfig: BuilderTypeConfig<LauncherData, LauncherUIState> = {
  defaultData: defaultLauncherData,
  defaultUIState: { tooltip: undefined, target: undefined },
};
