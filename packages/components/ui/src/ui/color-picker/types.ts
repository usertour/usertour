import type React from 'react';

export type TailwindColorData = {
  name: string;
  level: string;
  color: string;
};

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
  // from @usertour-packages/hooks (Apollo) and can live in @usertour-packages/ui.
  userId?: string | null;
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
};

export type ColorButtonProps = {
  color: string;
  tooltip: string;
  onClick: () => void;
  children?: React.ReactNode;
};
