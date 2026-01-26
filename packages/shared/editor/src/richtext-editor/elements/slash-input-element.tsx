'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Editor, Transforms } from 'slate';
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

import { insertUserAttributeBlock } from '../../lib/editorHelper';
import { toggleBlock } from '../toolbar/hooks/use-block-format';
import type { BlockFormat, SlashInputElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';
import { SLASH_COMMANDS, type SlashCommandConfig } from '../toolbar/toolbar.config';

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
  const [inputValue, setInputValue] = useState('/');
  const anchorRef = useComboboxAnchor();
  const inputRef = useRef<HTMLInputElement>(null);
  const isExecutingRef = useRef(false);

  // Extract search query from input value (remove leading "/")
  const searchQuery = inputValue.slice(1);

  /**
   * Execute selected command
   */
  const executeCommand = useCallback(
    (command: SlashCommandConfig) => {
      if (isExecutingRef.current) {
        return;
      }

      isExecutingRef.current = true;

      try {
        // Check if element still exists in editor
        const path = ReactEditor.findPath(editor, element);
        if (!path) {
          return;
        }

        // Verify the path is valid
        const node = Editor.node(editor, path);
        if (!node || node[0] !== element) {
          return;
        }

        Transforms.removeNodes(editor, { at: path });

        if (command.action === 'insert' && command.insertType === 'user-attribute') {
          insertUserAttributeBlock(editor);
        } else if (command.action === 'format' && command.format) {
          toggleBlock(editor, command.format as BlockFormat);
        }

        ReactEditor.focus(editor);
      } catch {
        // Element may have already been removed, just focus the editor
        ReactEditor.focus(editor);
      } finally {
        // Use requestAnimationFrame instead of setTimeout for better timing
        requestAnimationFrame(() => {
          isExecutingRef.current = false;
        });
      }
    },
    [editor, element],
  );

  /**
   * Remove slash input element and restore focus to editor
   */
  const removeSlashInput = useCallback(() => {
    if (isExecutingRef.current) {
      return;
    }

    try {
      // Check if element still exists in editor
      const path = ReactEditor.findPath(editor, element);
      if (!path) {
        return;
      }

      // Verify the path is valid by checking if we can find the node
      const node = Editor.node(editor, path);
      if (!node || node[0] !== element) {
        return;
      }

      Transforms.removeNodes(editor, { at: path });
      Transforms.insertText(editor, '/');
      ReactEditor.focus(editor);
    } catch {
      // Element may have already been removed, just focus the editor
      ReactEditor.focus(editor);
    }
  }, [editor, element]);

  /**
   * Normalize input value - ensure exactly one "/" prefix and remove duplicate slashes
   */
  const normalizeInputValue = useCallback((value: string): string => {
    // Remove all leading slashes and keep only one
    const trimmed = value.replace(/^\/+/, '');
    return `/${trimmed}`;
  }, []);

  /**
   * Handle input change - normalize to ensure exactly one "/" prefix
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const normalized = normalizeInputValue(value);
      setInputValue(normalized);
    },
    [normalizeInputValue],
  );

  /**
   * Handle keyboard events - only handle Escape and Backspace
   * Let Base UI handle ArrowUp/ArrowDown/Enter for navigation
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
        if (currentValue === '/' || normalizeInputValue(currentValue) === '/') {
          e.preventDefault();
          e.stopPropagation();
          removeSlashInput();
          return;
        }
      }

      // Let Base UI handle all other keys (ArrowUp/ArrowDown/Enter)
    },
    [normalizeInputValue, removeSlashInput],
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
  const itemToStringValue = (command: SlashCommandConfig) => command.label;

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
          const normalized = normalizeInputValue(value || '');
          setInputValue(normalized);
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
          sideOffset={8}
          className="w-64 border border-foreground/5 shadow-toolbar !ring-0"
          style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
        >
          <ComboboxEmpty>No commands found</ComboboxEmpty>
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
