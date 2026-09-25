import { ChecklistWidget } from '@/components/checklist';
import { buildChecklistSnapshot, createFakeChecklist } from '../fake/checklist';
import { onboardingChecklist } from '../fixtures/checklist';
import { defaultTheme } from '../fixtures/theme';
import { BlankPage } from './hosts';
import type { GalleryCase } from './types';

const checklistWidget = (expanded: boolean) => () => {
  const { checklist } = createFakeChecklist(
    buildChecklistSnapshot({ data: onboardingChecklist, theme: defaultTheme, expanded }),
  );
  return <ChecklistWidget checklist={checklist} />;
};

export const checklistCases: Record<string, GalleryCase> = {
  'checklist-collapsed': { host: BlankPage, widget: checklistWidget(false) },
  'checklist-expanded': { host: BlankPage, widget: checklistWidget(true) },
};
