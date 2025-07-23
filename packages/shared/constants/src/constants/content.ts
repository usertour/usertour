import { ContentPriority } from '@usertour/types';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

// Enum for better type safety and IDE support
export enum RulesType {
  USER_ATTR = 'user-attr',
  COMPANY_ATTR = 'company-attr',
  CURRENT_PAGE = 'current-page',
  EVENT = 'event',
  SEGMENT = 'segment',
  CONTENT = 'content',
  ELEMENT = 'element',
  TEXT_INPUT = 'text-input',
  TEXT_FILL = 'text-fill',
  TIME = 'time',
  GROUP = 'group',
  WAIT = 'wait',
  TASK_IS_CLICKED = 'task-is-clicked',
}

export const rulesTypes: RulesType[] = Object.values(RulesType);
