'use client';

import { useCallback } from 'react';
import type { RenderElementProps, RenderLeafProps } from 'slate-react';
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
 * Wrapper component that adds slash command keyboard handling to Editable
 * Must be inside Slate context
 */
export const SlashCommandEditableWrapper = ({
  onKeyDown,
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

  return <Editable {...editableProps} onKeyDown={handleKeyDown} />;
};

SlashCommandEditableWrapper.displayName = 'SlashCommandEditableWrapper';
