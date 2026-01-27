'use client';

import type { ComponentType } from 'react';

import type { BlockFormat, TextFormat } from '../../types/slate';

// Icon component props - using Record to be compatible with various icon libraries
// Different icon libraries have different prop types (Radix: string|number, custom: number)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolbarIconProps = Record<string, any>;

// Toolbar item types
export type ToolbarItemType = 'mark' | 'block' | 'link' | 'user-attribute' | 'color';

// Base toolbar item configuration
export interface BaseToolbarItemConfig {
  id: string;
  type: ToolbarItemType;
  tooltip: string;
  ariaLabel: string;
  icon: ComponentType<ToolbarIconProps>;
}

// Mark button config (bold, italic, underline)
export interface MarkToolbarItemConfig extends BaseToolbarItemConfig {
  type: 'mark';
  format: TextFormat;
}

// Block button config (h1, h2, code, lists)
export interface BlockToolbarItemConfig extends BaseToolbarItemConfig {
  type: 'block';
  format: BlockFormat;
}

// Link button config
export interface LinkToolbarItemConfig extends BaseToolbarItemConfig {
  type: 'link';
}

// User attribute button config
export interface UserAttributeToolbarItemConfig extends BaseToolbarItemConfig {
  type: 'user-attribute';
}

// Color picker config
export interface ColorToolbarItemConfig extends BaseToolbarItemConfig {
  type: 'color';
}

// Union type for all toolbar items
export type ToolbarItemConfig =
  | MarkToolbarItemConfig
  | BlockToolbarItemConfig
  | LinkToolbarItemConfig
  | UserAttributeToolbarItemConfig
  | ColorToolbarItemConfig;

// Alignment item configuration
export interface AlignmentItemConfig {
  id: string;
  format: 'left' | 'center' | 'right';
  tooltip: string;
  ariaLabel: string;
  icon: ComponentType<ToolbarIconProps>;
}

// Toolbar item component props (for toggle buttons)
export interface ToolbarItemProps {
  isActive: boolean;
  onToggle: (event: React.MouseEvent) => void;
  tooltip: string;
  ariaLabel: string;
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

// Toolbar popover item component props (for popover buttons like color picker)
export interface ToolbarPopoverItemProps {
  tooltip: string;
  ariaLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  popoverContent: React.ReactNode;
  popoverZIndex?: number;
}

// Block format hook return type
export interface UseBlockFormatReturn {
  isActive: boolean;
  toggle: (event: React.MouseEvent) => void;
}

// Mark format hook return type
export interface UseMarkFormatReturn {
  isActive: boolean;
  toggle: (event: React.MouseEvent) => void;
}

// Responsive toolbar hook return type
export interface UseResponsiveToolbarReturn {
  visibleItems: ToolbarItemConfig[];
  overflowItems: ToolbarItemConfig[];
  showOverflow: boolean;
}
