'use client';

import { memo, useCallback } from 'react';
import { useSlate } from 'slate-react';

import { insertUserAttributeBlock } from '../../../lib/editorHelper';
import { ICON_SIZE } from '../toolbar.styles';
import type { UserAttributeToolbarItemConfig } from '../toolbar.types';
import { ToolbarItem } from './toolbar-item';

interface UserAttrButtonProps {
  config: UserAttributeToolbarItemConfig;
}

/**
 * Button for inserting user attribute blocks
 * Single responsibility: only handles user attribute insertion
 */
export const UserAttrButton = memo(({ config }: UserAttrButtonProps) => {
  const editor = useSlate();
  const Icon = config.icon;

  const handleToggle = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      insertUserAttributeBlock(editor);
    },
    [editor],
  );

  return (
    <ToolbarItem
      isActive={false}
      onToggle={handleToggle}
      tooltip={config.tooltip}
      ariaLabel={config.ariaLabel}
      value={config.id}
    >
      <Icon height={ICON_SIZE.DEFAULT} width={ICON_SIZE.DEFAULT} />
    </ToolbarItem>
  );
});

UserAttrButton.displayName = 'UserAttrButton';
