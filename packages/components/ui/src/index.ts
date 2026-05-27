// =============================================================================
// Primitives — shadcn-style atoms moved into this package. One file per
// primitive under ./primitives/, mirrors the shadcn registry 1:1. To diff
// against upstream shadcn, look in ./primitives/.
// =============================================================================

export * from './primitives/accordion';
export * from './primitives/alert';
export * from './primitives/alert-dialog';
export * from './primitives/aspect-ratio';
export * from './primitives/avatar';
export * from './primitives/badge';
export * from './primitives/button';
export * from './primitives/calendar';
export * from './primitives/card';
export * from './primitives/chart';
export * from './primitives/checkbox';
export * from './primitives/collapsible';
export * from './primitives/command';
export * from './primitives/context-menu';
export * from './primitives/dialog';
export * from './primitives/dropdown-menu';
export * from './primitives/form';
export * from './primitives/frame';
export * from './primitives/hover-card';
export * from './primitives/input';
export * from './primitives/label';
export * from './primitives/menubar';
export * from './primitives/navigation-menu';
export * from './primitives/popover';
export * from './primitives/progress';
export * from './primitives/radio-group';
// scroll-area re-exported from ./compact (which wraps it with our defaults)
export * from './primitives/scroll-area';
export * from './primitives/select';
export * from './primitives/separator';
export * from './primitives/sheet';
// skeleton primitive re-export collides with compound ListSkeleton/etc. in
// ./ui/skeleton — the compound module is exported further down and shadows.
export { Skeleton } from './primitives/skeleton';
export * from './primitives/slider';
export * from './primitives/switch';
export * from './primitives/table';
export * from './primitives/tabs';
export * from './primitives/textarea';
export * from './primitives/toggle';
export * from './primitives/toggle-group';
export * from './primitives/tooltip';
export * from './primitives/use-toast';

// =============================================================================
// Compound components — built on top of primitives. Changing these does not
// drift us from upstream shadcn.
// =============================================================================

export * from './ui/combobox';
export * from './ui/input-group';
// Composition UI primitives — twice-composed shadcn-style components,
// no business knowledge, freely depended on by any consumer.
export { SelectPopover } from './ui/select-popover';
export type { SelectPopoverOption, SelectPopoverProps } from './ui/select-popover';
export { LoadingContainer } from './ui/loading';
export { LoadingButton } from './ui/loading-button';
export { NewItemButton } from './ui/new-item-button';
export { LocateSelect } from './ui/locate-select';
export type { LocateItem } from './ui/locate-select';
export { DateTimePicker } from './ui/date-time-picker';
export {
  ErrorTooltip,
  ErrorTooltipContent,
  ErrorTooltipTrigger,
  ErrorTooltipAnchor,
} from './ui/error-tooltip';
export { ColorPicker, ColorPickerPanel } from './ui/color-picker';
export type { ColorPickerProps, ColorPickerPanelProps } from './ui/color-picker';
export {
  ScaledPreviewContainer,
  AutoScaledPreviewContainer,
  useScaledPreview,
  calculateScale,
} from './ui/preview/scaled-preview-container';
export type {
  ScaledPreviewContainerProps,
  AutoScaledPreviewContainerProps,
  UseScaledPreviewOptions,
  UseScaledPreviewResult,
} from './ui/preview/scaled-preview-container';
export * from './ui/settings';
export * from './compact';

// Promoted from apps/web/src/components/molecules (pure UI primitives, no business types).
export { TruncatedText } from './ui/truncated-text';
export { EditableTitle } from './ui/editable-title';
export {
  ListSkeleton,
  AdminSkeleton,
  ListSkeletonCount,
  ContentListSkeleton,
  ThemeListSkeleton,
} from './ui/skeleton';
export { DateRangePicker } from './ui/date-range-picker';
export type { DateRangePickerProps } from './ui/date-range-picker';
export { DefaultAvatar } from './ui/default-avatar';
export { UserAvatar } from './ui/user-avatar';
export { ContentLoading } from './ui/content-loading';
export { CollapsibleSearch } from './ui/collapsible-search';
export {
  DATE_PRESET_OPTIONS,
  DEFAULT_PRESET_KEY,
  type DatePresetKey,
  type DatePresetOption,
} from './ui/date-presets';
