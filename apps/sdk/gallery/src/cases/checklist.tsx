import { ChecklistWidget } from '@/components/checklist';
import { buildChecklistSnapshot, createFakeChecklist } from '../fake/checklist';
import type { ChecklistData, ThemeTypesSetting } from '@usertour/types';
import { finishedChecklist, onboardingChecklist } from '../fixtures/checklist';
import { BlankPage } from './hosts';
import type { CaseParams, GalleryCase } from './types';

const checklistWidget =
  (
    expanded: boolean,
    data: ChecklistData = onboardingChecklist,
    themed: (theme: ThemeTypesSetting) => ThemeTypesSetting = (theme) => theme,
  ) =>
  ({ theme }: CaseParams) => {
    const { checklist } = createFakeChecklist(
      buildChecklistSnapshot({ data, theme: themed(theme), expanded }),
    );
    return <ChecklistWidget checklist={checklist} />;
  };

/** The checkmark color left on Auto, which should follow the brand color. */
const autoCheckmark = (theme: ThemeTypesSetting): ThemeTypesSetting => ({
  ...theme,
  checklist: { ...theme.checklist, checkmarkColor: 'Auto' },
});

export const checklistCases: Record<string, GalleryCase> = {
  'checklist-collapsed': { host: BlankPage, widget: checklistWidget(false) },
  'checklist-expanded': { host: BlankPage, widget: checklistWidget(true) },
  'checklist-finished': { host: BlankPage, widget: checklistWidget(true, finishedChecklist) },
  'checklist-auto-checkmark': {
    host: BlankPage,
    widget: checklistWidget(true, onboardingChecklist, autoCheckmark),
  },
};
