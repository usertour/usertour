import { DEFAULT_CHECKLIST_DATA } from '@usertour/constants';
import {
  type ChecklistData,
  type ChecklistItemType,
  type ContentEditorRoot,
} from '@usertour/types';
import { deepmerge } from 'deepmerge-ts';
import { isUndefined } from 'lodash';
import type { BuilderTypeConfig } from '@/pages/contents/components/builder/core/builder-type-config';
import { getDefaultDataForType } from '@/pages/contents/components/builder/utils/default-data';

// V1's ChecklistContext merged DEFAULT_CHECKLIST_DATA via deepmerge
// (vs Banner's spread — checklist has nested settings that need
// recursive merging) and fell back to a default tooltip content
// when the server payload had empty / missing `content`. Phase 2
// moves both into the type config's normalize.

const normalizeChecklistData = (raw: ChecklistData | undefined): ChecklistData => {
  const source = raw ?? ({} as ChecklistData);
  const merged = deepmerge(DEFAULT_CHECKLIST_DATA, source) as ChecklistData;
  if ((source.content && source.content.length === 0) || isUndefined(source.content)) {
    merged.content = getDefaultDataForType('tooltip') as ContentEditorRoot[];
  }
  return merged;
};

export const checklistTypeConfig: BuilderTypeConfig<ChecklistData, ChecklistItemType | null> = {
  defaultData: DEFAULT_CHECKLIST_DATA,
  normalize: normalizeChecklistData,
  defaultUIState: null,
};
