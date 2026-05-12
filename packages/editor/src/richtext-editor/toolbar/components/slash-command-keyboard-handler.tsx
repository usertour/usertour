'use client';

import { useCallback } from 'react';
import { Editor, Point, Range, Transforms } from 'slate';
import { useSlate } from 'slate-react';

/**
 * Create a slash input element node
 */
const createSlashInputElement = () => {
  return {
    type: 'slash-input' as const,
    children: [{ text: '' }],
  };
};

/**
 * Check if cursor is at the start of a line or after whitespace
 * Similar to Tiptap's behavior: only trigger slash command at line start or after space
 */
const shouldTriggerSlashCommand = (editor: Editor, selection: Range): boolean => {
  if (!Range.isCollapsed(selection)) {
    return false;
  }

  const { anchor } = selection;

  // Check if cursor is at the start of the block (line start)
  const blockStart = Editor.start(editor, anchor.path);
  if (Point.equals(anchor, blockStart)) {
    return true;
  }

  // Check the character before cursor
  const beforePoint = Editor.before(editor, anchor, { unit: 'character' });
  if (!beforePoint) {
    // No character before, treat as line start
    return true;
  }

  // Get the text before cursor
  const beforeRange = { anchor: beforePoint, focus: anchor };
  const beforeText = Editor.string(editor, beforeRange);

  // Check if the character before is whitespace (space, tab, newline)
  const lastChar = beforeText[beforeText.length - 1];
  if (lastChar && /\s/.test(lastChar)) {
    return true;
  }

  return false;
};

/**
 * Hook to handle slash command keyboard interactions
 * Returns a keyboard handler function that should be called from editor's onKeyDown
 * Only triggers when "/" is pressed at line start or after whitespace (similar to Tiptap)
 */
export const useSlashCommandKeyboard = () => {
  const editor = useSlate();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): boolean => {
      // Detect "/" key press to insert slash-input node
      // Check both key and code to handle different keyboard layouts
      const isSlashKey = event.key === '/' || event.code === 'Slash';
      if (isSlashKey && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        const { selection } = editor;
        if (selection && shouldTriggerSlashCommand(editor, selection)) {
          // Prevent default to handle manually
          event.preventDefault();

          // Insert slash-input element node
          const slashInputElement = createSlashInputElement();
          Transforms.insertNodes(editor, slashInputElement);

          return true;
        }
      }

      return false;
    },
    [editor],
  );

  return handleKeyDown;
};
