import { WidgetZIndex } from '@usertour/constants';
import type { ResourceCenterData, ThemeTypesSetting } from '@usertour/types';
import type { UsertourResourceCenter } from '@/core/usertour-resource-center';
import type { ResourceCenterStore } from '@/types/store';
import { ExternalStore } from '@/utils/store';
import { recordCall } from '../calls';
import { BASE_Z_INDEX, buildBaseSnapshot } from './base';

/** The slice of UsertourResourceCenter that ResourceCenterWidget touches. */
type ResourceCenterSurface = Pick<
  UsertourResourceCenter,
  | 'subscribe'
  | 'getSnapshot'
  | 'getAnnouncementBadgeCount'
  | 'expand'
  | 'persistNavState'
  | 'handleOnClick'
  | 'handleBlockClick'
  | 'handleContentListNavigate'
  | 'handleContentListItemClick'
  | 'handleLiveChatClick'
  | 'listAnnouncements'
  | 'getAnnouncement'
  | 'markAnnouncementsSeen'
  | 'dismissPopupAnnouncement'
>;

type ResourceCenterSnapshotInput = {
  data: ResourceCenterData;
  theme: ThemeTypesSetting;
  expanded: boolean;
};

/** The store UsertourResourceCenter holds while shown (getZIndex honours the theme override). */
export const buildResourceCenterSnapshot = (
  input: ResourceCenterSnapshotInput,
): ResourceCenterStore => {
  const { data, theme, expanded } = input;
  const zIndex = theme.resourceCenter?.zIndex ?? BASE_Z_INDEX + WidgetZIndex.RESOURCE_CENTER_OFFSET;
  return {
    ...buildBaseSnapshot(theme, zIndex),
    resourceCenterData: data,
    expanded,
    initialNav: null,
    contentListItems: [],
  };
};

/**
 * A stand-in UsertourResourceCenter. Expanding updates the store as the SDK
 * does; the announcement feed answers with an empty list; everything else is
 * only recorded.
 */
export const createFakeResourceCenter = (snapshot: ResourceCenterStore) => {
  const store = new ExternalStore<ResourceCenterStore>(snapshot);
  const surface: ResourceCenterSurface = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    getAnnouncementBadgeCount: () =>
      store.getSnapshot()?.resourceCenterData?.announcementUnreadCount ?? 0,
    expand: async (expanded) => {
      recordCall('resourceCenter.expand', expanded);
      store.update({ expanded });
    },
    persistNavState: (nav) => recordCall('resourceCenter.persistNavState', nav),
    handleOnClick: async (element) => recordCall('resourceCenter.handleOnClick', element),
    handleBlockClick: async (blockId) => recordCall('resourceCenter.handleBlockClick', blockId),
    handleContentListNavigate: async (block) => {
      recordCall('resourceCenter.handleContentListNavigate', block.id);
      return [];
    },
    handleContentListItemClick: async (item) =>
      recordCall('resourceCenter.handleContentListItemClick', item.contentId),
    handleLiveChatClick: async (block) =>
      recordCall('resourceCenter.handleLiveChatClick', block.id),
    listAnnouncements: async () => ({ announcements: [] }),
    getAnnouncement: async () => null,
    markAnnouncementsSeen: async (items) => {
      recordCall('resourceCenter.markAnnouncementsSeen', items);
      return true;
    },
    dismissPopupAnnouncement: async () => recordCall('resourceCenter.dismissPopupAnnouncement'),
  };
  return { resourceCenter: surface as UsertourResourceCenter, store };
};
