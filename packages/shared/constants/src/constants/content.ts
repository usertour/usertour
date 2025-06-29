import { ContentPriority } from '@usertour-ui/types';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

export const RULES_TYPES = {
  USER_ATTR: 'user-attr',
  COMPANY_ATTR: 'company-attr',
  CURRENT_PAGE: 'current-page',
  EVENT: 'event',
  SEGMENT: 'segment',
  CONTENT: 'content',
  ELEMENT: 'element',
  TEXT_INPUT: 'text-input',
  TEXT_FILL: 'text-fill',
  TIME: 'time',
  GROUP: 'group',
  TASK_IS_CLICKED: 'task-is-clicked',
};

export const rulesTypes: string[] = Object.values(RULES_TYPES);
