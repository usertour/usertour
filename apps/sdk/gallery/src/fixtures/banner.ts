import { DEFAULT_BANNER_DATA } from '@usertour/constants';
import type { BannerData, ContentEditorRoot } from '@usertour/types';

/** The builder's default banner (top of page, dismissible, animated in) with `contents`. */
export const topBanner = (contents: ContentEditorRoot[]): BannerData => ({
  ...DEFAULT_BANNER_DATA,
  contents,
});
