import {
  ChecklistCompletionOrder,
  ChecklistData,
  ChecklistInitialDisplay,
  ThemeDetailPreviewType,
  ThemeDetailSelectorType,
} from '@usertour/types';
import { hexToRgb } from '@usertour/helpers';

// ============================================================================
// Color Utility Functions
// ============================================================================

/**
 * Check if a color needs dark text for readability.
 * Uses standard luminance formula: 0.299*R + 0.587*G + 0.114*B
 * @param hex - Hex color string
 * @returns true if background is light and needs dark text
 */
export const needsDarkText = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false; // Invalid color defaults to dark background (white text)
  }
  const { r, g, b } = rgb;
  // Standard threshold 186: ensures text readability
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
};

/**
 * Check if a color is very close to white (needs gray border).
 * @param hex - Hex color string
 * @returns true only for colors very close to white
 */
export const isNearWhite = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false; // Invalid color defaults to no special border
  }
  const { r, g, b } = rgb;
  // Threshold 245: includes slate-50 (#F8FAFC) and similar very light colors
  return r * 0.299 + g * 0.587 + b * 0.114 > 245;
};

// ============================================================================
// Theme Configuration
// ============================================================================

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

const defaultChecklistContent = [
  {
    element: {
      type: 'group',
    },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: {
            type: 'fill',
          },
          justifyContent: 'justify-start',
        },
        children: [
          {
            element: {
              data: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      bold: true,
                      text: 'Content Pipeline Activated 🚀',
                    },
                  ],
                },
              ],
              type: 'text',
            },
          },
        ],
      },
    ],
  },
];

export const defaultChecklistData: ChecklistData = {
  buttonText: 'Get Started',
  initialDisplay: ChecklistInitialDisplay.EXPANDED,
  completionOrder: ChecklistCompletionOrder.ANY,
  preventDismissChecklist: false,
  autoDismissChecklist: false,
  content: defaultChecklistContent,
  items: [
    {
      id: '1',
      name: 'Set up your content calendar',
      description: 'Plan posts & deadlines',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '2',
      name: 'Draft your first piece',
      description: 'Use templates to speed up writing',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '3',
      name: 'Add visual assets',
      description: 'Pick photos or upload your own',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '4',
      name: 'Schedule a publish',
      description: 'Auto-post at the best time',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '5',
      name: 'Analyze performance',
      description: 'See top performing content',
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
  ],
};
