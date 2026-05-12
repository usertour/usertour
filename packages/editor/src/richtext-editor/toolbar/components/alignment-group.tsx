'use client';

import { ToggleGroup as ToolbarToggleGroup } from '@radix-ui/react-toolbar';
import { memo, useMemo } from 'react';
import { Editor, Element as SlateElement } from 'slate';
import { useSlate } from 'slate-react';

import { isInListOrCode, useBlockFormat } from '../hooks';
import { ICON_SIZE, TOOLBAR_TOGGLE_GROUP } from '../toolbar.styles';
import type { AlignmentItemConfig } from '../toolbar.types';
import { ToolbarItem } from './toolbar-item';

interface AlignmentButtonProps {
  config: AlignmentItemConfig;
}

/**
 * Individual alignment button component
 */
const AlignmentButton = memo(({ config }: AlignmentButtonProps) => {
  const editor = useSlate();
  const { isActive, toggle } = useBlockFormat(config.format);
  const Icon = config.icon;
  const disabled = isInListOrCode(editor);

  return (
    <ToolbarItem
      isActive={isActive}
      onToggle={toggle}
      tooltip={config.tooltip}
      ariaLabel={config.ariaLabel}
      value={config.id}
      disabled={disabled}
    >
      <Icon height={ICON_SIZE.DEFAULT} width={ICON_SIZE.DEFAULT} />
    </ToolbarItem>
  );
});

AlignmentButton.displayName = 'AlignmentButton';

interface AlignmentGroupProps {
  items: AlignmentItemConfig[];
}

/**
 * Group of alignment buttons (left, center, right)
 * Uses single selection toggle group
 */
export const AlignmentGroup = memo(({ items }: AlignmentGroupProps) => {
  const editor = useSlate();

  // Get current alignment from editor selection
  const currentAlignment = useMemo(() => {
    const { selection } = editor;
    if (!selection) return undefined;

    // Find the current block element to get its alignment
    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: (n) =>
          !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          (n.type === 'paragraph' || n.type === 'h1' || n.type === 'h2'),
      }),
    );

    if (match) {
      const [node] = match;
      if (SlateElement.isElement(node) && 'align' in node && node.align) {
        const alignValue = node.align as string;
        // Only return alignment if it matches one of the available items
        const isValidAlignment = items.some((item) => item.id === alignValue);
        return isValidAlignment ? alignValue : undefined;
      }
    }

    // Default to undefined if no explicit alignment is set
    return undefined;
  }, [editor]);

  return (
    <ToolbarToggleGroup
      type="single"
      value={currentAlignment}
      aria-label="Text alignment"
      className={TOOLBAR_TOGGLE_GROUP}
    >
      {items.map((item) => (
        <AlignmentButton key={item.id} config={item} />
      ))}
    </ToolbarToggleGroup>
  );
});

AlignmentGroup.displayName = 'AlignmentGroup';
