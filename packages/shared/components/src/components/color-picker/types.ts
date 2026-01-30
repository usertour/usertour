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
};

export type ColorPickerProps = {
  defaultColor: string;
  autoColor?: string;
  isAutoColor?: boolean;
  showAutoButton?: boolean;
  onChange?: (color: string) => void;
  className?: string;
  disabled?: boolean;
};

export type ColorButtonProps = {
  color: string;
  tooltip: string;
  onClick: () => void;
  children?: React.ReactNode;
};
