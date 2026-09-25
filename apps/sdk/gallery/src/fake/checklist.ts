import { WidgetZIndex } from '@usertour/constants';
import type { ChecklistData, ThemeTypesSetting } from '@usertour/types';
import type { UsertourChecklist } from '@/core/usertour-checklist';
import type { ChecklistStore } from '@/types/store';
import { ExternalStore } from '@/utils/store';
import { recordCall } from '../calls';
import { BASE_Z_INDEX, buildBaseSnapshot } from './base';

/** The slice of UsertourChecklist that ChecklistWidget touches. */
type ChecklistSurface = Pick<
  UsertourChecklist,
  | 'subscribe'
  | 'getSnapshot'
  | 'handleItemClick'
  | 'handleOnClick'
  | 'handleDismiss'
  | 'handleExpandedChange'
  | 'handleAutoDismiss'
>;

type ChecklistSnapshotInput = {
  data: ChecklistData;
  theme: ThemeTypesSetting;
  expanded: boolean;
};

/** The store UsertourChecklist holds while shown (getZIndex honours the theme override). */
export const buildChecklistSnapshot = (input: ChecklistSnapshotInput): ChecklistStore => {
  const { data, theme, expanded } = input;
  const zIndex = theme.checklist?.zIndex ?? BASE_Z_INDEX + WidgetZIndex.CHECKLIST_OFFSET;
  return { ...buildBaseSnapshot(theme, zIndex), checklistData: data, expanded };
};

/**
 * A stand-in UsertourChecklist. Expanding and collapsing update the store the
 * way the SDK does (the widget does not own that state); everything else is
 * only recorded.
 */
export const createFakeChecklist = (snapshot: ChecklistStore) => {
  const store = new ExternalStore<ChecklistStore>(snapshot);
  const surface: ChecklistSurface = {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    handleItemClick: async (item) => recordCall('checklist.handleItemClick', item.id),
    handleOnClick: async (element) => recordCall('checklist.handleOnClick', element),
    handleDismiss: async () => recordCall('checklist.handleDismiss'),
    handleExpandedChange: async (expanded) => {
      recordCall('checklist.handleExpandedChange', expanded);
      store.update({ expanded });
    },
    handleAutoDismiss: async () => recordCall('checklist.handleAutoDismiss'),
  };
  return { checklist: surface as UsertourChecklist, store };
};
