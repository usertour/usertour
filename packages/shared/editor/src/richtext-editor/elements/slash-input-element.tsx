'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Transforms } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useSlateStatic } from 'slate-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@usertour-packages/command';
import { EDITOR_RICH_TOOLBAR_MORE } from '@usertour-packages/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';

import { insertUserAttributeBlock } from '../../lib/editorHelper';
import { toggleBlock } from '../toolbar/hooks/use-block-format';
import type { BlockFormat, SlashInputElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';
import { SLASH_COMMANDS, type SlashCommandConfig } from '../toolbar/toolbar.config';

/**
 * Filter commands based on search query
 */
const filterCommands = (commands: SlashCommandConfig[], query: string): SlashCommandConfig[] => {
  if (!query) {
    return commands;
  }
  const lowerQuery = query.toLowerCase();
  return commands.filter((cmd) => cmd.label.toLowerCase().includes(lowerQuery));
};

/**
 * Slash input element component
 * Renders an inline input field with a popover menu for slash commands
 */
export const SlashInputElement = memo((props: RenderElementProps) => {
  const { attributes, children } = props;
  const element = props.element as SlashInputElementType;
  const editor = useSlateStatic();
  const { zIndex } = usePopperEditorContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo(
    () => filterCommands(SLASH_COMMANDS, searchQuery),
    [searchQuery],
  );

  // Auto-focus input when element is mounted
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Reset selected value when filtered commands change
  useEffect(() => {
    if (filteredCommands.length > 0) {
      // Set to first command's label if no selection
      if (!selectedValue || !filteredCommands.find((cmd) => cmd.label === selectedValue)) {
        setSelectedValue(filteredCommands[0]?.label ?? '');
      }
    } else {
      // Reset selected value when no commands match
      setSelectedValue('');
    }
  }, [filteredCommands, selectedValue]);

  /**
   * Track if command is being executed to prevent duplicate removal
   */
  const isExecutingRef = useRef(false);

  /**
   * Execute selected command
   */
  const executeCommand = useCallback(
    (command: SlashCommandConfig) => {
      if (isExecutingRef.current) {
        // Already executing, prevent duplicate execution
        return;
      }

      isExecutingRef.current = true;

      try {
        const path = ReactEditor.findPath(editor, element);

        // Remove slash input element
        Transforms.removeNodes(editor, { at: path });

        // Execute command action
        if (command.action === 'insert') {
          if (command.insertType === 'user-attribute') {
            insertUserAttributeBlock(editor);
          }
        } else if (command.action === 'format' && command.format) {
          toggleBlock(editor, command.format as BlockFormat);
        }
      } finally {
        // Reset flag after a short delay to allow component unmount
        setTimeout(() => {
          isExecutingRef.current = false;
        }, 100);
      }
    },
    [editor, element],
  );

  /**
   * Remove slash input element
   */
  const removeSlashInput = useCallback(() => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, { at: path });
    // Move cursor to the position where slash input was
    Transforms.insertText(editor, '/');
  }, [editor, element]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Remove leading "/" if present
      const query = value.startsWith('/') ? value.slice(1) : value;
      setSearchQuery(query);
      // Reset selection to first item
      if (filteredCommands.length > 0) {
        setSelectedValue(filteredCommands[0]?.label ?? '');
      }
    },
    [filteredCommands],
  );

  /**
   * Handle keyboard events
   * Note: ArrowUp/ArrowDown are handled by Command component, we only handle Enter and Escape
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          // Only execute if there are available commands
          if (filteredCommands.length === 0) {
            // No commands available, just remove the slash input
            removeSlashInput();
            break;
          }
          // Find command by selected value and execute it
          if (selectedValue) {
            const command = filteredCommands.find((cmd) => cmd.label === selectedValue);
            if (command) {
              executeCommand(command);
            } else {
              // Fallback to first command if selected value not found
              executeCommand(filteredCommands[0]);
            }
          } else {
            // Fallback to first command if no selection
            executeCommand(filteredCommands[0]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          removeSlashInput();
          break;

        case 'Backspace':
          // If input is empty, remove the slash input element
          if (searchQuery === '' && e.currentTarget.value === '/') {
            e.preventDefault();
            removeSlashInput();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          // Navigate to previous command
          if (filteredCommands.length > 0) {
            const currentIndex = filteredCommands.findIndex((cmd) => cmd.label === selectedValue);
            const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredCommands.length - 1;
            setSelectedValue(filteredCommands[newIndex]?.label ?? '');
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          // Navigate to next command
          if (filteredCommands.length > 0) {
            const currentIndex = filteredCommands.findIndex((cmd) => cmd.label === selectedValue);
            const newIndex = currentIndex < filteredCommands.length - 1 ? currentIndex + 1 : 0;
            setSelectedValue(filteredCommands[newIndex]?.label ?? '');
          }
          break;

        default:
          // Allow normal text input
          break;
      }
    },
    [filteredCommands, selectedValue, searchQuery, executeCommand, removeSlashInput],
  );

  /**
   * Handle Command value change (when user navigates with arrow keys)
   */
  const handleCommandValueChange = useCallback((value: string) => {
    setSelectedValue(value);
  }, []);

  /**
   * Handle Popover open/close
   * When Popover closes (user clicks outside, loses focus, etc.), remove the slash input
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isExecutingRef.current) {
        // Popover closed and not executing command, remove slash input element
        removeSlashInput();
      }
    },
    [removeSlashInput],
  );

  // Keep popover open as long as the element exists
  // This ensures the menu stays open even when filtering results in no matches
  // The popover will close when handleOpenChange is called (user clicks outside, etc.)
  const isOpen = true;

  return (
    <span {...attributes} contentEditable={false} className="inline-block">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <span className="relative inline-block min-h-[1lh]">
            {/* Invisible span for sizing */}
            <span className="invisible overflow-hidden text-nowrap" aria-hidden="true">
              /{searchQuery || '\u200B'}
            </span>
            {/* Actual input overlay */}
            <input
              ref={inputRef}
              type="text"
              value={`/${searchQuery}`}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="absolute top-0 left-0 size-full bg-transparent outline-none"
              style={{ font: 'inherit' }}
            />
          </span>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0"
          side="bottom"
          align="start"
          sideOffset={8}
          style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus on PopoverContent, keep focus on input
            e.preventDefault();
          }}
        >
          <Command
            shouldFilter={false}
            value={selectedValue}
            onValueChange={handleCommandValueChange}
          >
            {/* Hidden CommandInput for proper focus management with Command component */}
            <CommandInput
              value={searchQuery}
              onValueChange={(value) => {
                setSearchQuery(value);
                if (filteredCommands.length > 0) {
                  setSelectedValue(filteredCommands[0]?.label ?? '');
                }
              }}
              className="sr-only"
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
            <CommandList>
              <CommandEmpty>No commands found</CommandEmpty>
              <CommandGroup>
                {filteredCommands.map((command) => {
                  const Icon = command.icon;

                  return (
                    <CommandItem
                      key={command.id}
                      value={command.label}
                      onSelect={() => {
                        executeCommand(command);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{command.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
