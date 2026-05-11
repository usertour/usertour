// Compact UI family — primitives sized for dense form / inspector / sidebar
// contexts (30px control height, 12px text, soft muted surfaces). They're
// thin wrappers around the shared shadcn primitives, locked into a coherent
// visual rhythm so a settings-style panel reads as one piece.

// Compact UI family — composition wrappers and self-contained components for
// dense form / inspector / sidebar contexts. Plain styled primitives
// (Input, Switch, IconButton) live in their atomic packages with cva
// variants — call those directly with `variant="compact-muted"` etc. The
// wrappers below either compose multiple primitives (CompactSelect,
// CompactDropdownMenu*, CompactTabs*) or are standalone components that
// don't fit any atomic shelf (CompactPanel, ResizeHandle, InlineAlert,
// CompactColorButton).

export { CompactSelect, type CompactSelectOption } from './select';
export { CompactColorButton } from './color-button';
export {
  CompactPopoverTrigger,
  type CompactPopoverTriggerProps,
} from './popover-trigger';
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
} from './tokens';
