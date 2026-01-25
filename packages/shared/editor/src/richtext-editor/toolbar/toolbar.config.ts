import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiBold,
  RiCodeSSlashFill,
  RiFontColor,
  RiH1,
  RiH2,
  RiItalic,
  RiLink,
  RiListOrdered2,
  RiListUnordered,
  RiUnderline,
  RiUserFill,
} from '@usertour-packages/icons';

import type { ComponentType } from 'react';

import type { AlignmentItemConfig, ToolbarItemConfig } from './toolbar.types';

// Main toolbar items configuration
export const TOOLBAR_ITEMS: ToolbarItemConfig[] = [
  {
    id: 'bold',
    type: 'mark',
    format: 'bold',
    tooltip: 'Bold ⌘B',
    ariaLabel: 'Toggle bold formatting',
    icon: RiBold,
  },
  {
    id: 'italic',
    type: 'mark',
    format: 'italic',
    tooltip: 'Italic ⌘I',
    ariaLabel: 'Toggle italic formatting',
    icon: RiItalic,
  },
  {
    id: 'underline',
    type: 'mark',
    format: 'underline',
    tooltip: 'Underline ⌘U',
    ariaLabel: 'Toggle underline formatting',
    icon: RiUnderline,
  },
  {
    id: 'color',
    type: 'color',
    tooltip: 'Font color',
    ariaLabel: 'Choose font color',
    icon: RiFontColor,
  },
  {
    id: 'code',
    type: 'block',
    format: 'code',
    tooltip: 'Code ⌘`',
    ariaLabel: 'Toggle code block',
    icon: RiCodeSSlashFill,
  },
  {
    id: 'h1',
    type: 'block',
    format: 'h1',
    tooltip: 'Heading 1',
    ariaLabel: 'Toggle heading 1',
    icon: RiH1,
  },
  {
    id: 'h2',
    type: 'block',
    format: 'h2',
    tooltip: 'Heading 2',
    ariaLabel: 'Toggle heading 2',
    icon: RiH2,
  },
  {
    id: 'link',
    type: 'link',
    tooltip: 'Insert link',
    ariaLabel: 'Insert link',
    icon: RiLink,
  },
  {
    id: 'user-attribute',
    type: 'user-attribute',
    tooltip: 'User attribute',
    ariaLabel: 'Insert user attribute',
    icon: RiUserFill,
  },
  {
    id: 'numbered-list',
    type: 'block',
    format: 'numbered-list',
    tooltip: 'Numbered list',
    ariaLabel: 'Toggle numbered list',
    icon: RiListOrdered2,
  },
  {
    id: 'bulleted-list',
    type: 'block',
    format: 'bulleted-list',
    tooltip: 'Bulleted list',
    ariaLabel: 'Toggle bulleted list',
    icon: RiListUnordered,
  },
];

// Alignment items configuration (separate from main toolbar items)
export const ALIGNMENT_ITEMS: AlignmentItemConfig[] = [
  {
    id: 'left',
    format: 'left',
    tooltip: 'Align left',
    ariaLabel: 'Align text left',
    icon: RiAlignLeft,
  },
  {
    id: 'center',
    format: 'center',
    tooltip: 'Align center',
    ariaLabel: 'Align text center',
    icon: RiAlignCenter,
  },
  {
    id: 'right',
    format: 'right',
    tooltip: 'Align right',
    ariaLabel: 'Align text right',
    icon: RiAlignRight,
  },
];

// List types for block formatting
export const LIST_TYPES: readonly string[] = ['numbered-list', 'bulleted-list'];

// Text alignment types for block formatting
export const TEXT_ALIGN_TYPES: readonly string[] = ['left', 'center', 'right', 'justify'];

// Slash command configuration
export interface SlashCommandConfig {
  id: string;
  label: string;
  icon: ComponentType<any>;
  action: 'insert' | 'format';
  // For insert actions
  insertType?: 'user-attribute' | 'link';
  // For format actions
  formatType?: 'block';
  format?: string;
}

// Slash commands available in the menu
export const SLASH_COMMANDS: SlashCommandConfig[] = [
  {
    id: 'user-attribute',
    label: 'User Attribute',
    icon: RiUserFill,
    action: 'insert',
    insertType: 'user-attribute',
  },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: RiH1,
    action: 'format',
    formatType: 'block',
    format: 'h1',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: RiH2,
    action: 'format',
    formatType: 'block',
    format: 'h2',
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: RiCodeSSlashFill,
    action: 'format',
    formatType: 'block',
    format: 'code',
  },
  {
    id: 'numbered-list',
    label: 'Numbered List',
    icon: RiListOrdered2,
    action: 'format',
    formatType: 'block',
    format: 'numbered-list',
  },
  {
    id: 'bulleted-list',
    label: 'Bulleted List',
    icon: RiListUnordered,
    action: 'format',
    formatType: 'block',
    format: 'bulleted-list',
  },
];
