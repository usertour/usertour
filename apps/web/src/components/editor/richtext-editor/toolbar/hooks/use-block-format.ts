import { useCallback } from 'react';
import { Editor, Element as SlateElement, Transforms } from 'slate';
import { useSlate } from 'slate-react';

import type { BlockFormat, CustomEditor } from '../../../types/slate';
import { LIST_TYPES, TEXT_ALIGN_TYPES } from '../toolbar.config';
import type { UseBlockFormatReturn } from '../toolbar.types';

/**
 * Check if a block format is currently active
 */
const isBlockActive = (editor: CustomEditor, format: BlockFormat, blockType = 'type'): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType as keyof typeof n] === format,
    }),
  );

  return !!match;
};

/**
 * Check if cursor is currently in a list or code block
 * These block types should not support alignment
 */
const isInListOrCode = (editor: CustomEditor): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n.type === 'list-item' ||
          n.type === 'bulleted-list' ||
          n.type === 'numbered-list' ||
          n.type === 'code'),
    }),
  );

  return !!match;
};

/**
 * Toggle block formatting (headings, lists, code, alignment)
 */
const toggleBlock = (editor: CustomEditor, format: BlockFormat) => {
  const { selection } = editor;
  // Early return if no selection
  if (!selection) {
    return;
  }

  // Prevent alignment changes when in list or code block
  if (TEXT_ALIGN_TYPES.includes(format) && isInListOrCode(editor)) {
    return;
  }

  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type',
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  let newProperties: Partial<SlateElement>;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    };
  } else {
    // Type assertion is safe here - alignment types are excluded by the if branch above
    const elementType = isActive ? 'paragraph' : isList ? 'list-item' : format;
    newProperties = {
      type: elementType as SlateElement['type'],
    };
  }
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    // Type assertion is safe here because isList ensures format is 'numbered-list' or 'bulleted-list'
    const block = { type: format as 'numbered-list' | 'bulleted-list', children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

/**
 * Hook to manage block format state and toggle functionality
 */
export const useBlockFormat = (format: BlockFormat): UseBlockFormatReturn => {
  const editor = useSlate();

  const blockType = TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type';
  const isActive = isBlockActive(editor, format, blockType);

  const toggle = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      toggleBlock(editor, format);
    },
    [editor, format],
  );

  return { isActive, toggle };
};

// Export utilities for external use
export { isBlockActive, isInListOrCode, toggleBlock };
