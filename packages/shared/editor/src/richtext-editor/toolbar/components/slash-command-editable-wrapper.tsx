'use client';

import { useCallback } from 'react';
import type { RenderElementProps, RenderLeafProps, RenderPlaceholderProps } from 'slate-react';
import { Editable } from 'slate-react';

import { useSlashCommandKeyboard } from './slash-command-keyboard-handler';

interface SlashCommandEditableWrapperProps {
  renderElement: (props: RenderElementProps) => JSX.Element;
  renderLeaf: (props: RenderLeafProps) => JSX.Element;
  placeholder?: string;
  spellCheck?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Custom placeholder renderer with italic style
 */
const renderPlaceholder = ({ attributes, children }: RenderPlaceholderProps) => {
  return (
    <span {...attributes} className="italic text-muted-foreground pointer-events-none">
      {children}
    </span>
  );
};

/**
 * Wrapper component that adds slash command keyboard handling to Editable
 * Must be inside Slate context
 */
export const SlashCommandEditableWrapper = ({
  onKeyDown,
  placeholder,
  ...editableProps
}: SlashCommandEditableWrapperProps) => {
  const handleSlashKeyDown = useSlashCommandKeyboard();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Handle slash commands first
      if (handleSlashKeyDown(event)) {
        return;
      }

      // Then call the original handler
      onKeyDown?.(event);
    },
    [handleSlashKeyDown, onKeyDown],
  );

  return (
    <Editable
      {...editableProps}
      placeholder={placeholder}
      renderPlaceholder={renderPlaceholder}
      onKeyDown={handleKeyDown}
    />
  );
};

SlashCommandEditableWrapper.displayName = 'SlashCommandEditableWrapper';
