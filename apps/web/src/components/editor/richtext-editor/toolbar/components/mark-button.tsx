'use client';

import { memo } from 'react';

import { useMarkFormat } from '../hooks';
import { ICON_SIZE } from '../toolbar.styles';
import type { MarkToolbarItemConfig } from '../toolbar.types';
import { ToolbarItem } from './toolbar-item';

interface MarkButtonProps {
  config: MarkToolbarItemConfig;
}

/**
 * Button for toggling text marks (bold, italic, underline)
 * Single responsibility: only handles text mark formatting
 */
export const MarkButton = memo(({ config }: MarkButtonProps) => {
  const { isActive, toggle } = useMarkFormat(config.format);
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

MarkButton.displayName = 'MarkButton';
