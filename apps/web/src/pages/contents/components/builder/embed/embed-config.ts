import type { EmbedData } from '@usertour/types';
import { DEFAULT_EMBED_DATA } from '@usertour/constants';
import type { BuilderTypeConfig } from '@/pages/contents/components/builder/core/builder-type-config';

// The embed's shell (placement, target, dismiss, sizes) lives in
// `currentVersion.data`; its steps live in `currentVersion.steps` and are
// edited through useFlowEditor. This config serves only the shell.
const normalizeEmbedData = (raw: EmbedData | undefined): EmbedData => ({
  ...DEFAULT_EMBED_DATA,
  ...(raw ?? {}),
});

// The target sub-view edits a draft of the shell's target element and, for
// the cover placement, its z-index, and writes both back on Save, as the
// launcher's target sub-view does. The draft sits in the shared per-type UI
// slot so the sub-view's header, body and footer read the same one.
export interface EmbedTargetDraft {
  targetElement: EmbedData['targetElement'];
  zIndex: EmbedData['zIndex'];
}

export interface EmbedUIState {
  target: EmbedTargetDraft | undefined;
}

export const embedTypeConfig: BuilderTypeConfig<EmbedData, EmbedUIState> = {
  defaultData: DEFAULT_EMBED_DATA,
  normalize: normalizeEmbedData,
  defaultUIState: { target: undefined },
};
