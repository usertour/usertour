'use client';

import { memo } from 'react';

import { useBlockFormat } from '../hooks';
import { ICON_SIZE } from '../toolbar.styles';
import type { BlockToolbarItemConfig } from '../toolbar.types';
import { ToolbarItem } from './toolbar-item';

interface BlockButtonProps {
  config: BlockToolbarItemConfig;
}

/**
 * Button for toggling block-level formatting (h1, h2, code, lists)
 * Single responsibility: only handles block format toggling
 */
export const BlockButton = memo(({ config }: BlockButtonProps) => {
  const { isActive, toggle } = useBlockFormat(config.format);
  const Icon = config.icon;

  return (
    <ToolbarItem
      isActive={isActive}
      onToggle={toggle}
      tooltip={config.tooltip}
      ariaLabel={config.ariaLabel}
      value={config.id}
    >
      <Icon height={ICON_SIZE.DEFAULT} width={ICON_SIZE.DEFAULT} />
    </ToolbarItem>
  );
});

BlockButton.displayName = 'BlockButton';
