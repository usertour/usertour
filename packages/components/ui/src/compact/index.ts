// Compact UI family — primitives sized for dense form / inspector / sidebar
// contexts (30px control height, 12px text, soft muted surfaces). They're
// thin wrappers around the shared shadcn primitives, locked into a coherent
// visual rhythm so a settings-style panel reads as one piece.

export { CompactInput } from './input';
export { CompactSelect, type CompactSelectOption } from './select';
export { CompactIconButton } from './icon-button';
export { CompactColorButton } from './color-button';
export { CompactSwitch } from './switch';
export {
  CompactDropdownMenu,
  CompactDropdownMenuTrigger,
  CompactDropdownMenuContent,
  CompactDropdownMenuItem,
} from './dropdown-menu';
export {
  CompactTabs,
  CompactTabsList,
  CompactTabsTrigger,
  CompactTabsContent,
} from './tabs';
export { CompactPanel } from './panel';
export { ResizeHandle } from './resize-handle';
export { InlineAlert } from './inline-alert';
export {
  bodyClass,
  footerClass,
  headerClass,
  listRowClass,
  listRowSelectedClass,
  panelClass,
  panelRightClass,
  pillClass,
  sectionLabelClass,
  topBarClass,
} from './tokens';
