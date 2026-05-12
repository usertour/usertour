// Main toolbar component
export { EditorToolbar } from './toolbar';

// Standalone user attribute button (for mini editor)
export { UserAttrButton } from './user-attr';

// Configuration for customization
export {
  ALIGNMENT_ITEMS,
  LIST_TYPES,
  SLASH_COMMANDS,
  TEXT_ALIGN_TYPES,
  TOOLBAR_ITEMS,
} from './toolbar.config';
export type { SlashCommandConfig } from './toolbar.config';

// Types for external use
export type {
  AlignmentItemConfig,
  BlockToolbarItemConfig,
  ColorToolbarItemConfig,
  LinkToolbarItemConfig,
  MarkToolbarItemConfig,
  ToolbarIconProps,
  ToolbarItemConfig,
  ToolbarItemProps,
  ToolbarItemType,
  ToolbarPopoverItemProps,
  UserAttributeToolbarItemConfig,
} from './toolbar.types';

// Hooks for external use
export { isBlockActive, toggleBlock, useBlockFormat } from './hooks/use-block-format';
export { isMarkActive, useMarkFormat } from './hooks/use-mark-format';
