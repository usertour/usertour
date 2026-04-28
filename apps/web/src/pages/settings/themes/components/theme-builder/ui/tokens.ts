// Layout tokens shared across theme-builder. Visual tokens for individual
// controls (input/select/switch/color button/icon button/save button) are
// owned by the wrapper components in `./builder-*.tsx` rather than as raw
// className strings.

// Text
export const sectionLabelClass = 'text-xs font-medium text-muted-foreground';

// Sidebar list row (variation row)
export const listRowClass =
  'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/50';
export const listRowSelectedClass = 'bg-primary/10 text-primary hover:bg-primary/15';

// Pills (System tag, etc.)
export const pillClass =
  'rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground';

// Top bar
export const topBarClass =
  'relative flex h-15 flex-none items-center justify-between border-b border-border/50 bg-background px-3';

// Sidebar panel chrome. `relative` so the resize handle (positioned absolute)
// anchors to the panel.
export const sidebarPanelClass =
  'relative flex flex-none flex-col border-r border-border/50 bg-background';
export const sidebarPanelRightClass =
  'relative flex flex-none flex-col border-l border-border/50 bg-background';
export const sidebarHeaderClass = 'flex-none border-b border-border/50 px-3 py-2.5';
export const sidebarFooterClass = 'flex-none border-t border-border/50 px-3 py-2';
export const sidebarBodyClass = 'flex-1 overflow-y-auto';
