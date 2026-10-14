'use client';

import { memo, useCallback } from 'react';
import { useSlate } from 'slate-react';

import { insertLink, isLinkActive } from '../../../lib/editorHelper';
import { ICON_SIZE } from '../toolbar.styles';
import type { LinkToolbarItemConfig } from '../toolbar.types';
import { ToolbarItem } from './toolbar-item';

interface LinkButtonProps {
  config: LinkToolbarItemConfig;
}

/**
 * Button for inserting links
 * Single responsibility: only handles link insertion
 */
export const LinkButton = memo(({ config }: LinkButtonProps) => {
  const editor = useSlate();
  const isActive = isLinkActive(editor);
  const Icon = config.icon;

  const handleToggle = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      insertLink(editor, '');
    },
    [editor],
  );

  return (
    <ToolbarItem
      isActive={isActive}
      onToggle={handleToggle}
      tooltip={config.tooltip}
      ariaLabel={config.ariaLabel}
      value={config.id}
    >
      <Icon height={ICON_SIZE.DEFAULT} width={ICON_SIZE.DEFAULT} />
    </ToolbarItem>
  );
});

LinkButton.displayName = 'LinkButton';
