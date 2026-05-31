import { BuilderMode } from '../../contexts/builder-mode';
import type { BuilderTypeConfig } from '../../types/builder-type-config';

// Flow is structurally different from the other four content types
// (Banner / Checklist / Launcher / RC): those edit a `data` blob in
// `currentVersion.data`; Flow edits `currentVersion.steps` (an array)
// plus per-step content via separate step-detail / step-trigger
// sub-modes. The BuilderTypeConfig marker is kept for uniformity
// (every type has a config record); the real editing surface for
// Flow lives in useFlowEditor — not useTypeEditor.

export const flowTypeConfig: BuilderTypeConfig<undefined, undefined> = {
  mode: BuilderMode.FLOW,
  defaultData: undefined,
};
