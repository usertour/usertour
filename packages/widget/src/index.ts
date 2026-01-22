// Primitives - Base components
export { Button, type ButtonProps } from './primitives';
export { Input, type InputProps } from './primitives';
export { Textarea, type TextareaProps } from './primitives';
export { Checkbox, type CheckboxProps } from './primitives';
export { Label, type LabelProps } from './primitives';
export {
  RadioGroup,
  RadioGroupItem,
  type RadioGroupProps,
  type RadioGroupItemProps,
} from './primitives';

// Typography - Text components
export {
  InlineCode,
  CodeBlock,
  getInlineCodeClassName,
  getBlockCodeClassName,
  getPreClassName,
  type InlineCodeProps,
  type CodeBlockProps,
  Heading,
  getHeadingClassName,
  type HeadingProps,
  type HeadingLevel,
  List,
  ListItem,
  getListClassName,
  type ListProps,
  type ListItemProps,
  type ListType,
  Paragraph,
  getParagraphClassName,
  type ParagraphProps,
  Link,
  getLinkClassName,
  type LinkProps,
} from './typography';

// Question - Rating and selection components
export {
  // Types
  type SelectionOption,
  // Star Rating
  StarRating,
  StarButton,
  StarRatingDisplay,
  type StarRatingProps,
  type StarRatingDisplayProps,
  // Scale
  Scale,
  ScaleDisplay,
  calculateScaleLength,
  validateScaleRange,
  type ScaleProps,
  type ScaleDisplayProps,
  // NPS
  NPSScale,
  NPSLabels,
  NPS_SCALE_LENGTH,
  NPS_DEFAULT_LOW_LABEL,
  NPS_DEFAULT_HIGH_LABEL,
  DEFAULT_LOW_LABEL,
  DEFAULT_HIGH_LABEL,
  type NPSScaleProps,
  type NPSLabelsProps,
  // Option Item
  OptionItem,
  type OptionItemProps,
  // Other Option Input
  OtherOptionInput,
  type OtherOptionInputProps,
  // Single Selection
  SingleSelection,
  SingleSelectionDisplay,
  type SingleSelectionProps,
  type SingleSelectionDisplayProps,
  // Multiple Selection
  MultipleSelection,
  MultipleSelectionDisplay,
  type MultipleSelectionProps,
  type MultipleSelectionDisplayProps,
  // Constants
  QUESTION_BUTTON_BASE_CLASS,
  QUESTION_SCALE_GRID_CLASS,
  QUESTION_LABELS_CONTAINER_CLASS,
  STAR_SVG_PATH,
  DEFAULT_BUTTON_TEXT,
  DEFAULT_OPTION_PREFIX,
  DEFAULT_OTHER_PLACEHOLDER,
  OPTION_ITEM_BASE_CLASS,
  OPTION_ITEM_EDITING_CLASS,
  OTHER_INPUT_CLASS,
  OTHER_SUBMIT_BUTTON_CLASS,
} from './question';

// Media - Embed and media components
export {
  // Types
  type DimensionType,
  type Dimension,
  type MarginPosition,
  type Margin,
  type OEmbedData,
  type EmbedData,
  // Embed
  Embed,
  EmbedContent,
  type EmbedProps,
  type EmbedContentProps,
  // Constants
  DEFAULT_EMBED_SIZE,
  DEFAULT_EMBED_WIDTH,
  DEFAULT_EMBED_HEIGHT,
  MARGIN_KEY_MAPPING,
  MARGIN_POSITIONS,
} from './media';

// Future: High-level components (to be migrated from shared/sdk)
// export { Popper, PopperContent, PopperArrow } from './popper';
// export { Bubble } from './bubble';
// export { Checklist } from './checklist';
// export { Launcher } from './launcher';
