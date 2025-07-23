import {
  ChecklistCompletionOrder,
  ChecklistData,
  ChecklistInitialDisplay,
  ThemeDetailPreviewType,
  ThemeDetailSelectorType,
} from '@usertour-packages/types';

export const themeDetailSelectorTypes: ThemeDetailSelectorType[] = [
  {
    name: 'Tooltip',
    type: ThemeDetailPreviewType.TOOLTIP,
  },
  {
    name: 'Modal',
    type: ThemeDetailPreviewType.MODAL,
  },
  {
    name: 'Launcher Icon',
    type: ThemeDetailPreviewType.LAUNCHER_ICON,
  },
  {
    name: 'Launcher Beacon',
    type: ThemeDetailPreviewType.LAUNCHER_BEACON,
  },
  {
    name: 'Checklist',
    type: ThemeDetailPreviewType.CHECKLIST,
  },
  {
    name: 'Checklist Launcher',
    type: ThemeDetailPreviewType.CHECKLIST_LAUNCHER,
  },
  {
    name: 'NPS question',
    type: ThemeDetailPreviewType.NPS,
  },
];

export const defaultChecklistData: ChecklistData = {
  buttonText: 'Get Started',
  initialDisplay: ChecklistInitialDisplay.EXPANDED,
  completionOrder: ChecklistCompletionOrder.ANY,
  preventDismissChecklist: false,
  autoDismissChecklist: false,
  items: [
    {
      id: '1',
      name: 'First item',
      description: 'Checklist',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '2',
      name: 'Second item',
      description: 'Checklist',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '3',
      name: 'Third item',
      description: 'Checklist',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
  ],
  content: [],
};
