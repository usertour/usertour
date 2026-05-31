import type { ResourceCenterBlock, ResourceCenterData, ResourceCenterTab } from '@usertour/types';
import { BuilderMode } from '../../contexts/builder-mode';
import type { BuilderTypeConfig } from '../../types/builder-type-config';

// ResourceCenter has the largest per-type UI buffer of any type — four
// concurrent slots track different sub-mode cursors (the in-flight
// currentBlock and editingTab buffers the user is editing, the
// currentTabId selection in the main RC view, plus an isShowError
// flag for explicit-save validation feedback).

export interface ResourceCenterUIState {
  currentBlock: ResourceCenterBlock | null;
  currentTabId: string | null;
  editingTab: ResourceCenterTab | null;
  isShowError: boolean;
}

// V1's ResourceCenterProvider casts currentVersion.data straight to
// ResourceCenterData with no merge — server-side defaults are baked
// in at creation. defaultData stays minimal (empty tabs); normalize
// is unnecessary.
const emptyResourceCenterData: ResourceCenterData = {
  tabs: [],
} as unknown as ResourceCenterData;

export const resourceCenterTypeConfig: BuilderTypeConfig<
  ResourceCenterData,
  ResourceCenterUIState
> = {
  mode: BuilderMode.RESOURCE_CENTER,
  defaultData: emptyResourceCenterData,
  defaultUIState: {
    currentBlock: null,
    currentTabId: null,
    editingTab: null,
    isShowError: false,
  },
};
