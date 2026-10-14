import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiBold,
  RiCodeSSlashFill,
  RiFontFamily,
  RiH1,
  RiH2,
  RiItalic,
  RiLink,
  RiListOrdered2,
  RiListUnordered,
  RiText,
  RiUnderline,
  RiUserFill,
} from '@usertour/icons';

import type { ComponentType } from 'react';

import type { AlignmentItemConfig, ToolbarItemConfig } from './toolbar.types';

// Main toolbar items configuration
export const TOOLBAR_ITEMS: ToolbarItemConfig[] = [
  {
    id: 'bold',
    type: 'mark',
    format: 'bold',
    tooltip: 'contentBuilder.editor.toolbar.bold.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.bold.ariaLabel',
    icon: RiBold,
  },
  {
    id: 'italic',
    type: 'mark',
    format: 'italic',
    tooltip: 'contentBuilder.editor.toolbar.italic.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.italic.ariaLabel',
    icon: RiItalic,
  },
  {
    id: 'underline',
    type: 'mark',
    format: 'underline',
    tooltip: 'contentBuilder.editor.toolbar.underline.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.underline.ariaLabel',
    icon: RiUnderline,
  },
  {
    id: 'color',
    type: 'color',
    tooltip: 'contentBuilder.editor.toolbar.color.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.color.ariaLabel',
    icon: RiFontFamily,
  },
  {
    id: 'code',
    type: 'block',
    format: 'code',
    tooltip: 'contentBuilder.editor.toolbar.code.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.code.ariaLabel',
    icon: RiCodeSSlashFill,
  },
  {
    id: 'h1',
    type: 'block',
    format: 'h1',
    tooltip: 'contentBuilder.editor.toolbar.h1.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.h1.ariaLabel',
    icon: RiH1,
  },
  {
    id: 'h2',
    type: 'block',
    format: 'h2',
    tooltip: 'contentBuilder.editor.toolbar.h2.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.h2.ariaLabel',
    icon: RiH2,
  },
  {
    id: 'link',
    type: 'link',
    tooltip: 'contentBuilder.editor.toolbar.link.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.link.ariaLabel',
    icon: RiLink,
  },
  {
    id: 'user-attribute',
    type: 'user-attribute',
    tooltip: 'contentBuilder.editor.toolbar.userAttribute.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.userAttribute.ariaLabel',
    icon: RiUserFill,
  },
  {
    id: 'numbered-list',
    type: 'block',
    format: 'numbered-list',
    tooltip: 'contentBuilder.editor.toolbar.numberedList.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.numberedList.ariaLabel',
    icon: RiListOrdered2,
  },
  {
    id: 'bulleted-list',
    type: 'block',
    format: 'bulleted-list',
    tooltip: 'contentBuilder.editor.toolbar.bulletedList.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.bulletedList.ariaLabel',
    icon: RiListUnordered,
  },
];

// Alignment items configuration (separate from main toolbar items)
export const ALIGNMENT_ITEMS: AlignmentItemConfig[] = [
  {
    id: 'left',
    format: 'left',
    tooltip: 'contentBuilder.editor.toolbar.alignLeft.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.alignLeft.ariaLabel',
    icon: RiAlignLeft,
  },
  {
    id: 'center',
    format: 'center',
    tooltip: 'contentBuilder.editor.toolbar.alignCenter.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.alignCenter.ariaLabel',
    icon: RiAlignCenter,
  },
  {
    id: 'right',
    format: 'right',
    tooltip: 'contentBuilder.editor.toolbar.alignRight.tooltip',
    ariaLabel: 'contentBuilder.editor.toolbar.alignRight.ariaLabel',
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
    id: 'paragraph',
    label: 'contentBuilder.editor.toolbar.slashCommand.text',
    icon: RiText,
    action: 'format',
    formatType: 'block',
    format: 'paragraph',
  },
  {
    id: 'h1',
    label: 'contentBuilder.editor.toolbar.slashCommand.h1',
    icon: RiH1,
    action: 'format',
    formatType: 'block',
    format: 'h1',
  },
  {
    id: 'h2',
    label: 'contentBuilder.editor.toolbar.slashCommand.h2',
    icon: RiH2,
    action: 'format',
    formatType: 'block',
    format: 'h2',
  },
  {
    id: 'code',
    label: 'contentBuilder.editor.toolbar.slashCommand.codeBlock',
    icon: RiCodeSSlashFill,
    action: 'format',
    formatType: 'block',
    format: 'code',
  },
  {
    id: 'numbered-list',
    label: 'contentBuilder.editor.toolbar.slashCommand.numberedList',
    icon: RiListOrdered2,
    action: 'format',
    formatType: 'block',
    format: 'numbered-list',
  },
  {
    id: 'bulleted-list',
    label: 'contentBuilder.editor.toolbar.slashCommand.bulletedList',
    icon: RiListUnordered,
    action: 'format',
    formatType: 'block',
    format: 'bulleted-list',
  },
  {
    id: 'user-attribute',
    label: 'contentBuilder.editor.toolbar.slashCommand.userAttribute',
    icon: RiUserFill,
    action: 'insert',
    insertType: 'user-attribute',
  },
];
