import type React from 'react';

export type TailwindColorData = {
  name: string;
  level: string;
  color: string;
};

/** All visible text strings rendered by ColorPickerPanel. Pass `t(...)` values from the consumer. */
export interface ColorPickerPanelLabels {
  /** Tooltip on the confirm/apply icon button. */
  useThisColor: string;
  /** Tooltip on the remove-color (use-default) icon button. */
  removeColor: string;
  /** Section heading above the Tailwind color grid. */
  tailwindColors: string;
  /** Section heading above the recently-used swatches. */
  recentlyUsed: string;
  /** Label on the "Done" link that exits recent-colors edit mode. */
  done: string;
  /** Tab label for the freeform hex color picker. */
  colorPicker: string;
  /** Tab label for the Tailwind palette grid. */
  colorPalette: string;
}

export type ColorPickerPanelProps = {
  color?: string;
  isAuto?: boolean;
  showAutoButton?: boolean;
  onChange: (isAuto: boolean, color?: string) => void;
  // Identity used to scope the per-user "recent colors" storage. When
  // omitted, recents live in a global bucket — callers in an authenticated
  // context should pass the current user's id from useCurrentUserId() so
  // each operator gets their own swatch history. Kept as a prop (rather
  // than reading the user hook inside) so this component stays decoupled
  // from @usertour/hooks (Apollo) and can live in @usertour/ui.
  userId?: string | null;
  /** Visible text labels. All strings must be supplied by the caller via t(). */
  labels: ColorPickerPanelLabels;
};

export type ColorPickerProps = {
  defaultColor: string;
  autoColor?: string;
  isAutoColor?: boolean;
  showAutoButton?: boolean;
  onChange?: (color: string) => void;
  className?: string;
  disabled?: boolean;
  // Forwarded to ColorPickerPanel for per-user recents storage. See
  // ColorPickerPanelProps.userId.
  userId?: string | null;
  /** Forwarded to ColorPickerPanel. Supplied by the caller via t(). */
  labels: ColorPickerPanelLabels;
  /** Label for the auto-color state shown on the trigger. From t(). */
  autoLabel: string;
};

export type ColorButtonProps = {
  color: string;
  tooltip: string;
  onClick: () => void;
  children?: React.ReactNode;
};
