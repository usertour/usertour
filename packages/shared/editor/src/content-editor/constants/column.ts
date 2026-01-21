// Column-specific constants

import type { ComboBoxOption } from '@usertour-packages/combo-box';

import { ALIGN_ITEMS_OPTIONS, JUSTIFY_CONTENT_OPTIONS } from './styles';

// ComboBox options for justify content (horizontal distribution)
export const JUSTIFY_CONTENT_OPTIONS_LIST: ComboBoxOption[] = [
  { value: JUSTIFY_CONTENT_OPTIONS.START, name: 'Left' },
  { value: JUSTIFY_CONTENT_OPTIONS.CENTER, name: 'Center' },
  { value: JUSTIFY_CONTENT_OPTIONS.END, name: 'Right' },
  { value: JUSTIFY_CONTENT_OPTIONS.BETWEEN, name: 'Space Between' },
  { value: JUSTIFY_CONTENT_OPTIONS.EVENLY, name: 'Space Evenly' },
  { value: JUSTIFY_CONTENT_OPTIONS.AROUND, name: 'Space Around' },
];

// ComboBox options for align items (vertical alignment)
export const ALIGN_ITEMS_OPTIONS_LIST: ComboBoxOption[] = [
  { value: ALIGN_ITEMS_OPTIONS.START, name: 'Top' },
  { value: ALIGN_ITEMS_OPTIONS.CENTER, name: 'Center' },
  { value: ALIGN_ITEMS_OPTIONS.END, name: 'Bottom' },
  { value: ALIGN_ITEMS_OPTIONS.BASELINE, name: 'Baseline' },
];
