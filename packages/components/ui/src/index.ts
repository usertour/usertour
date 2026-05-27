// Export all UI components
// Add new component exports here as you create them
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
