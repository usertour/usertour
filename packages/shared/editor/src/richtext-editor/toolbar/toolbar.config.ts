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
