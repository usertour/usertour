// Column-specific constants

import type { CompactSelectOption } from '@usertour/ui';

import { ALIGN_ITEMS_OPTIONS, JUSTIFY_CONTENT_OPTIONS } from './styles';

// Justify-content options for horizontal distribution
export const JUSTIFY_CONTENT_OPTIONS_LIST: CompactSelectOption[] = [
  { value: JUSTIFY_CONTENT_OPTIONS.START, label: 'Left' },
  { value: JUSTIFY_CONTENT_OPTIONS.CENTER, label: 'Center' },
  { value: JUSTIFY_CONTENT_OPTIONS.END, label: 'Right' },
  { value: JUSTIFY_CONTENT_OPTIONS.BETWEEN, label: 'Space Between' },
  { value: JUSTIFY_CONTENT_OPTIONS.EVENLY, label: 'Space Evenly' },
  { value: JUSTIFY_CONTENT_OPTIONS.AROUND, label: 'Space Around' },
];

// Align-items options for vertical alignment
export const ALIGN_ITEMS_OPTIONS_LIST: CompactSelectOption[] = [
  { value: ALIGN_ITEMS_OPTIONS.START, label: 'Top' },
  { value: ALIGN_ITEMS_OPTIONS.CENTER, label: 'Center' },
  { value: ALIGN_ITEMS_OPTIONS.END, label: 'Bottom' },
  { value: ALIGN_ITEMS_OPTIONS.BASELINE, label: 'Baseline' },
];
