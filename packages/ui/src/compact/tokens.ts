// Layout className tokens for the compact UI family. These are the structural
// classes — the per-control visual tokens (h-7.5 / muted / depth shadow) live
// inside each component file.

// Section labels (form / inspector titles)
export const sectionLabelClass = 'text-sm font-medium text-muted-foreground';

// List rows (variation list, navigation). Focus uses bg-shift (no ring)
// because list rows flow vertically — a 3px ring would visually bleed into
// the rows above/below. Same pattern as chip surfaces in Conditions.
export const listRowClass =
  'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:text-foreground';
export const listRowSelectedClass = 'bg-primary/10 text-primary hover:bg-primary/15';

// Pills (system / status tags)
export const pillClass =
  'rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground';

// Side panel chrome. `relative` so absolute-positioned descendants (resize
// handle, close button, etc.) anchor to the panel.
export const panelClass = 'relative flex flex-none flex-col border-r border-border/50 bg-card';
export const panelRightClass = 'relative flex flex-none flex-col border-l border-border/50 bg-card';

// Panel sub-regions
export const headerClass = 'flex-none border-b border-border/50 px-3 py-2.5';
export const footerClass = 'flex-none border-t border-border/50 px-3 py-2';
export const bodyClass = 'flex-1 overflow-y-auto';
