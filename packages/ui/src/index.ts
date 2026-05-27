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
// Frame intentionally NOT re-exported — it's an iframe-portal domain
// primitive (used by sdk/widget for embedded rendering), not a shadcn
// registry atom. Lives in @usertour/frame to keep sdk/widget bundles
// from transitively pulling the entire @usertour/ui surface.
export * from './primitives/hover-card';
export * from './primitives/input';
export * from './primitives/label';
export * from './primitives/menubar';
export * from './primitives/navigation-menu';
export * from './primitives/popover';
export * from './primitives/progress';
export * from './primitives/radio-group';
export * from './primitives/scroll-area';
export * from './primitives/select';
export * from './primitives/separator';
export * from './primitives/sheet';
export * from './primitives/skeleton';
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

export * from './composites/combobox';
export * from './composites/input-group';
// Composition UI primitives — twice-composed shadcn-style components,
// no business knowledge, freely depended on by any consumer.
export { SelectPopover } from './composites/select-popover';
export type { SelectPopoverOption, SelectPopoverProps } from './composites/select-popover';
export { LoadingContainer } from './composites/loading';
export { LoadingButton } from './composites/loading-button';
export type { LoadingButtonProps } from './composites/loading-button';
export { NewItemButton } from './composites/new-item-button';
export type { NewItemButtonProps } from './composites/new-item-button';
export { LocateSelect } from './composites/locate-select';
export type { LocateItem, LocateSelectProps } from './composites/locate-select';
export { DateTimePicker } from './composites/date-time-picker';
export type { DateTimePickerProps } from './composites/date-time-picker';
export {
  ErrorTooltip,
  ErrorTooltipContent,
  ErrorTooltipTrigger,
  ErrorTooltipAnchor,
} from './composites/error-tooltip';
export type {
  ErrorTooltipContentProps,
  ErrorTooltipTriggerProps,
} from './composites/error-tooltip';
export { ColorPicker, ColorPickerPanel } from './composites/color-picker';
export type { ColorPickerProps, ColorPickerPanelProps } from './composites/color-picker';
export {
  ScaledPreviewContainer,
  AutoScaledPreviewContainer,
  useScaledPreview,
  calculateScale,
} from './composites/preview/scaled-preview-container';
export type {
  ScaledPreviewContainerProps,
  AutoScaledPreviewContainerProps,
  UseScaledPreviewOptions,
  UseScaledPreviewResult,
} from './composites/preview/scaled-preview-container';
export * from './composites/settings';
export * from './compact';

// Promoted from apps/web/src/components/molecules (pure UI primitives, no business types).
export { TruncatedText } from './composites/truncated-text';
export { EditableTitle } from './composites/editable-title';
export type { EditableTitleProps } from './composites/editable-title';
export {
  ListSkeleton,
  AdminSkeleton,
  ListSkeletonCount,
} from './composites/skeleton';
export { DateRangePicker } from './composites/date-range-picker';
export type { DateRangePickerProps } from './composites/date-range-picker';
export { DefaultAvatar } from './composites/default-avatar';
export { UserAvatar } from './composites/user-avatar';
export { ContentLoading } from './composites/content-loading';
export type { ContentLoadingProps } from './composites/content-loading';
export { CollapsibleSearch } from './composites/collapsible-search';
export {
  DATE_PRESET_RANGE_GETTERS,
  DEFAULT_PRESET_KEY,
  type DatePresetKey,
  type DatePresetOption,
} from './composites/date-presets';
