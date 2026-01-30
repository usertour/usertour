// Question components for SDK widget

// Types
export type { SelectionOption } from './types';

// Constants
export {
  // NPS constants
  NPS_SCALE_LENGTH,
  NPS_DEFAULT_LOW_LABEL,
  NPS_DEFAULT_HIGH_LABEL,
  // Scale/Button styles
  QUESTION_BUTTON_BASE_CLASS,
  QUESTION_SCALE_GRID_CLASS,
  QUESTION_LABELS_CONTAINER_CLASS,
  // Star rating
  STAR_SVG_PATH,
  // Selection constants
  DEFAULT_BUTTON_TEXT,
  DEFAULT_OPTION_PREFIX,
  DEFAULT_OTHER_PLACEHOLDER,
  OPTION_ITEM_BASE_CLASS,
  OPTION_ITEM_EDITING_CLASS,
  OTHER_INPUT_CLASS,
  OTHER_SUBMIT_BUTTON_CLASS,
} from './constants';

// Star Rating
export {
  StarRating,
  StarButton,
  // Backward compatibility
  StarRatingDisplay,
  type StarRatingProps,
  type StarRatingDisplayProps,
} from './star-rating';

// Scale
export {
  Scale,
  calculateScaleLength,
  validateScaleRange,
  // Backward compatibility
  ScaleDisplay,
  type ScaleProps,
  type ScaleDisplayProps,
} from './scale';

// NPS
export {
  NPSScale,
  NPSLabels,
  DEFAULT_LOW_LABEL,
  DEFAULT_HIGH_LABEL,
  type NPSScaleProps,
  type NPSLabelsProps,
} from './nps';

// Option Item
export { OptionItem, type OptionItemProps } from './option-item';

// Other Option Input
export { OtherOptionInput, type OtherOptionInputProps } from './other-option-input';

// Single Selection
export {
  SingleSelection,
  // Backward compatibility
  SingleSelectionDisplay,
  type SingleSelectionProps,
  type SingleSelectionDisplayProps,
} from './single-selection';

// Multiple Selection
export {
  MultipleSelection,
  // Backward compatibility
  MultipleSelectionDisplay,
  type MultipleSelectionProps,
  type MultipleSelectionDisplayProps,
} from './multiple-selection';
