import type { ResourceCenterBlock, ResourceCenterData, ResourceCenterTab } from '@usertour/types';
import { BuilderMode } from '../../core/builder-mode';
import type { BuilderTypeConfig } from '../../core/builder-type-config';

// ResourceCenter's per-type UI buffer holds the in-flight sub-mode drafts the
// user is editing — currentBlock and editingTab — plus an isShowError flag for
// explicit-save validation feedback. The active tab is NOT here: it lives in
// the URL (tab/:tabId), read via useParams in use-resource-center-editor.

export interface ResourceCenterUIState {
  currentBlock: ResourceCenterBlock | null;
  editingTab: ResourceCenterTab | null;
  isShowError: boolean;
}

// V1's ResourceCenterProvider casts currentVersion.data straight to
// ResourceCenterData with no merge — server-side defaults are baked in at
// creation. defaultData stays minimal (empty tabs); normalize is unnecessary.
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
    editingTab: null,
    isShowError: false,
  },
};
