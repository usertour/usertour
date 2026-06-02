import { type BannerData, DEFAULT_BANNER_DATA } from '@usertour/types';
import { isUndefined } from 'lodash';
import type { BuilderTypeConfig } from '@/pages/contents/components/builder/core/builder-type-config';
import { getEmptyDataForType } from '@/pages/contents/components/builder/core/utils/default-data';

// V1's BannerContext normalized fresh server data by (a) merging in
// DEFAULT_BANNER_DATA defaults and (b) falling back to a default
// contents tree when the server payload had empty / missing contents.
// Phase 2 moves both into the type config's normalize so the rest of
// Banner doesn't need a Provider — useTypeEditor reads, applies
// normalize, and materializes the result back into currentVersion.data
// on the first write.

const normalizeBannerData = (raw: BannerData | undefined): BannerData => {
  const source = raw ?? ({} as BannerData);
  const merged: BannerData = { ...DEFAULT_BANNER_DATA, ...source };
  if (source.contents?.length === 0 || isUndefined(source.contents)) {
    merged.contents = getEmptyDataForType();
  }
  return merged;
};

export const bannerTypeConfig: BuilderTypeConfig<BannerData> = {
  defaultData: DEFAULT_BANNER_DATA,
  normalize: normalizeBannerData,
};
