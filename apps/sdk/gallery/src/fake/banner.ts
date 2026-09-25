import type { BannerData, ThemeTypesSetting } from '@usertour/types';
import type { ComponentProps } from 'react';
import type { BannerWidget } from '@/components/banner';
import type { BannerStore } from '@/types/store';
import { ExternalStore } from '@/utils/store';
import { recordCall } from '../calls';
import { BASE_Z_INDEX, buildBaseSnapshot } from './base';

/** BannerWidget already types its instance structurally; take that shape as-is. */
type BannerSurface = ComponentProps<typeof BannerWidget>['banner'];

type BannerSnapshotInput = {
  data: BannerData;
  theme: ThemeTypesSetting;
  targetElement?: Element | null;
};

/** The store UsertourBanner holds while shown (getZIndex honours data.zIndex). */
export const buildBannerSnapshot = (input: BannerSnapshotInput): BannerStore => {
  const { data, theme, targetElement = null } = input;
  const zIndex = data.zIndex ?? BASE_Z_INDEX;
  return { ...buildBaseSnapshot(theme, zIndex), bannerData: data, targetElement };
};

/** A stand-in UsertourBanner whose handlers only record their calls. */
export const createFakeBanner = (snapshot: BannerStore) => {
  const store = new ExternalStore<BannerStore>(snapshot);
  const banner: BannerSurface = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    handleDismiss: async () => recordCall('banner.handleDismiss'),
    handleOnClick: async (element, value) => recordCall('banner.handleOnClick', element, value),
  };
  return { banner, store };
};
