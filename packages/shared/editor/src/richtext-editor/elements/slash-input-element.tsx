'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, Element as SlateElement, Transforms, type Path } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useSlateStatic } from 'slate-react';

import { EDITOR_RICH_TOOLBAR_MORE } from '@usertour-packages/constants';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInputInline,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@usertour-packages/ui';

import { RiSearchLine } from '@usertour-packages/icons';

import { insertUserAttributeBlock } from '../../lib/editorHelper';
import { toggleBlock } from '../toolbar/hooks/use-block-format';
import type { BlockFormat, CustomEditor, SlashInputElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';
import { SLASH_COMMANDS, type SlashCommandConfig } from '../toolbar/toolbar.config';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates that an element path exists and points to the correct element
 * @param editor - The Slate editor instance
 * @param element - The element to validate
 * @returns A tuple of [isValid, path] where isValid indicates if the path is valid
 */
function validateElementPath(
  editor: CustomEditor,
  element: SlashInputElementType,
): [boolean, Path | null] {
  try {
    const path = ReactEditor.findPath(editor, element);
    if (!path) {
      return [false, null];
    }

    // Verify the path is valid by checking if we can find the node
    const node = Editor.node(editor, path);
    if (!node || node[0] !== element) {
      return [false, null];
    }

    return [true, path];
  } catch {
    // Silently fail - element may have already been removed
    return [false, null];
  }
}

/**
 * Normalizes input value to ensure exactly one "/" prefix
 * Removes duplicate leading slashes and ensures the value starts with "/"
 * @param value - The input value to normalize
 * @returns The normalized value with exactly one leading "/"
 */
function normalizeSlashInput(value: string): string {
  // Remove all leading slashes and keep only one
  const trimmed = value.replace(/^\/+/, '');
  return `/${trimmed}`;
}

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to manage slash input state
 * Handles input value state and search query extraction
 */
function useSlashInputState() {
  const [inputValue, setInputValue] = useState('/');

  // Extract search query from input value (remove leading "/")
  // Memoized to avoid unnecessary recalculations
  const searchQuery = useMemo(() => inputValue.slice(1), [inputValue]);

  /**
   * Normalize and update input value
   */
  const normalizeInput = useCallback((value: string): string => {
    return normalizeSlashInput(value);
  }, []);

  /**
   * Update input value with normalization
   */
  const updateInputValue = useCallback(
    (value: string) => {
      const normalized = normalizeInput(value);
      setInputValue(normalized);
    },
    [normalizeInput],
  );

  return {
    inputValue,
    searchQuery,
    setInputValue,
    updateInputValue,
    normalizeInput,
  };
}

/**
 * Hook to handle editor operations for slash input
 * Manages element removal and path validation
 */
function useSlashInputEditor(
  editor: CustomEditor,
  element: SlashInputElementType,
  isExecutingRef: React.MutableRefObject<boolean>,
) {
  /**
   * Remove slash input element and restore focus to editor
   */
  const removeSlashInput = useCallback(() => {
    if (isExecutingRef.current) {
      return;
    }

    const [isValid, path] = validateElementPath(editor, element);
    if (!isValid || !path) {
      // Element may have already been removed, just focus the editor
      ReactEditor.focus(editor);
      return;
    }

    try {
      Transforms.removeNodes(editor, { at: path });
      Transforms.insertText(editor, '/');
      ReactEditor.focus(editor);
    } catch {
      // Element may have already been removed, just focus the editor
      ReactEditor.focus(editor);
    }
  }, [editor, element, isExecutingRef]);

  return {
    removeSlashInput,
  };
}

/**
 * Hook to execute slash commands
 * Handles command execution logic including insert and format operations
 */
function useSlashCommandExecutor(editor: CustomEditor, element: SlashInputElementType) {
  const isExecutingRef = useRef(false);

  /**
   * Move cursor after inserted element
   * Simplified logic for moving cursor after user-attribute insertion
   */
  const moveCursorAfterInsert = useCallback((editor: CustomEditor) => {
    const { selection } = editor;
    if (!selection) {
      return;
    }

    try {
      // Get the parent path (the user attribute element path)
      const parentPath = selection.anchor.path.slice(0, -1);
      const [parentNode] = Editor.node(editor, parentPath);

      if (
        parentNode &&
        SlateElement.isElement(parentNode) &&
        'type' in parentNode &&
        parentNode.type === 'user-attribute'
      ) {
        // Try to find the position after the user attribute element
        const afterPoint = Editor.after(editor, {
          path: parentPath,
          offset: 0,
        });
        if (afterPoint) {
          Transforms.select(editor, afterPoint);
          return;
        }
      }
    } catch {
      // Silently fail and use fallback
    }

    // Fallback: move cursor forward one character
    try {
      Transforms.move(editor, { distance: 1, unit: 'character' });
    } catch {
      // Silently fail if cursor movement is not possible
    }
  }, []);

  /**
   * Execute insert command (e.g., user-attribute)
   */
  const executeInsertCommand = useCallback(
    (editor: CustomEditor, command: SlashCommandConfig) => {
      if (command.action === 'insert' && command.insertType === 'user-attribute') {
        // Insert user attribute block
        insertUserAttributeBlock(editor);

        // Move cursor after the inserted user attribute element
        moveCursorAfterInsert(editor);
      }
    },
    [moveCursorAfterInsert],
  );

  /**
   * Execute format command (e.g., h1, h2, code)
   */
  const executeFormatCommand = useCallback((editor: CustomEditor, command: SlashCommandConfig) => {
    if (command.action === 'format' && command.format) {
      toggleBlock(editor, command.format as BlockFormat);
    }
  }, []);

  /**
   * Execute selected command
   */
  const executeCommand = useCallback(
    (command: SlashCommandConfig) => {
      // Prevent duplicate execution
      if (isExecutingRef.current) {
        return;
      }

      isExecutingRef.current = true;

      try {
        // Validate element path before proceeding
        const [isValid, path] = validateElementPath(editor, element);
        if (!isValid || !path) {
          return;
        }

        // Remove the slash input element
        Transforms.removeNodes(editor, { at: path });

        // Execute the command based on its type
        if (command.action === 'insert') {
          executeInsertCommand(editor, command);
        } else if (command.action === 'format') {
          executeFormatCommand(editor, command);
        }

        // Restore focus to editor
        ReactEditor.focus(editor);
      } catch {
        // Ensure editor is focused even if command execution fails
        ReactEditor.focus(editor);
      } finally {
        // Reset execution lock after a short delay
        // Use setTimeout instead of requestAnimationFrame for more reliable timing
        setTimeout(() => {
          isExecutingRef.current = false;
        }, 0);
      }
    },
    [editor, element, executeInsertCommand, executeFormatCommand],
  );

  return {
    executeCommand,
    isExecutingRef,
  };
}

/**
 * Hook to handle keyboard events for slash input
 * Manages Escape, Backspace, and other special key handling
 */
function useSlashInputKeyboard(
  removeSlashInput: () => void,
  normalizeInput: (value: string) => string,
) {
  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        removeSlashInput();
        return;
      }

      if (e.key === 'Backspace') {
        const currentValue = e.currentTarget.value;
        // If only "/" remains (or empty after normalization), remove the element
        if (currentValue === '/' || normalizeInput(currentValue) === '/') {
          e.preventDefault();
          e.stopPropagation();
          removeSlashInput();
          return;
        }
      }

      // Let Base UI handle all other keys (ArrowUp/ArrowDown/Enter)
    },
    [normalizeInput, removeSlashInput],
  );

  return {
    handleKeyDown,
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Slash input element component
 * Renders an inline input field with a combobox menu for slash commands
 * Uses Combobox component for better focus management and built-in filtering
 */
export const SlashInputElement = memo((props: RenderElementProps) => {
  const { attributes, children } = props;
  const element = props.element as SlashInputElementType;
  const editor = useSlateStatic();
  const { zIndex } = usePopperEditorContext();
  const anchorRef = useComboboxAnchor();
  const inputRef = useRef<HTMLInputElement>(null);

  // State management
  const { inputValue, searchQuery, updateInputValue, normalizeInput } = useSlashInputState();

  // Command executor (provides isExecutingRef)
  const { executeCommand, isExecutingRef } = useSlashCommandExecutor(editor, element);

  // Editor operations
  const { removeSlashInput } = useSlashInputEditor(editor, element, isExecutingRef);

  // Keyboard handling
  const { handleKeyDown } = useSlashInputKeyboard(removeSlashInput, normalizeInput);

  /**
   * Handle input change - normalize to ensure exactly one "/" prefix
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateInputValue(value);
    },
    [updateInputValue],
  );

  /**
   * Handle Combobox open/close
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isExecutingRef.current) {
        removeSlashInput();
      }
    },
    [removeSlashInput],
  );

  /**
   * Handle item selection from Combobox
   */
  const handleValueChange = useCallback(
    (value: SlashCommandConfig | null) => {
      if (value) {
        executeCommand(value);
      }
    },
    [executeCommand],
  );

  /**
   * Extract string value from command for filtering
   */
  const itemToStringValue = useCallback((command: SlashCommandConfig) => {
    return command.label;
  }, []);

  // Auto-focus input when element is mounted
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <span {...attributes} contentEditable={false} className="inline-block">
      <Combobox
        items={SLASH_COMMANDS}
        itemToStringValue={itemToStringValue}
        open={true}
        onOpenChange={handleOpenChange}
        onValueChange={handleValueChange}
        autoHighlight
        inputValue={searchQuery}
        onInputValueChange={(value: string) => {
          updateInputValue(value || '');
        }}
      >
        <span ref={anchorRef} className="relative inline-block min-h-[1lh]">
          <span className="invisible overflow-hidden text-nowrap" aria-hidden="true">
            {inputValue || '/\u200B'}
          </span>
          <ComboboxInputInline
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="absolute top-0 left-0 size-full bg-transparent outline-none border-none p-0"
            style={{ font: 'inherit' }}
          />
        </span>
        <ComboboxContent
          anchor={anchorRef}
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-64 border border-foreground/5 shadow-toolbar !ring-0"
          positionerStyle={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
        >
          <ComboboxEmpty className="items-center justify-center gap-2 pb-0">
            <RiSearchLine className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No search results</span>
          </ComboboxEmpty>
          <ComboboxList>
            {(command: SlashCommandConfig) => {
              const Icon = command.icon;
              return (
                <ComboboxItem key={command.id} value={command}>
                  <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{command.label}</span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {children}
    </span>
  );
});

SlashInputElement.displayName = 'SlashInputElement';

/**
 * Slash input element for serialized/rendered output
 * Renders as plain text "/" in serialized content
 */
export const SlashInputElementSerialize = memo(() => {
  return <span>/</span>;
});

SlashInputElementSerialize.displayName = 'SlashInputElementSerialize';
