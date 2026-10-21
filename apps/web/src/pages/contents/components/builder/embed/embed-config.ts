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

export const embedTypeConfig: BuilderTypeConfig<EmbedData> = {
  defaultData: DEFAULT_EMBED_DATA,
  normalize: normalizeEmbedData,
};
