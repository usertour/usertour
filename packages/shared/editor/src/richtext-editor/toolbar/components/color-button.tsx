'use client';

import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import { PopoverArrow } from '@usertour-packages/popover';
import { ColorPickerPanel } from '@usertour-packages/shared-components';
import { memo, useCallback, useMemo, useState } from 'react';
import { useSlate } from 'slate-react';

import { getTextProps, removeTextProps, setTextProps } from '../../../lib/text';
import { usePopperEditorContext } from '../../editor';
import { ICON_SIZE } from '../toolbar.styles';
import type { ColorToolbarItemConfig } from '../toolbar.types';
import { ToolbarPopoverItem } from './toolbar-popover-item';

// Constants
const COLOR_MARK = 'color';
const DEFAULT_COLOR = '#000000';

interface ColorButtonProps {
  config: ColorToolbarItemConfig;
}

/**
 * Button for selecting font color
 * Uses ToolbarPopoverItem for consistent styling with other toolbar buttons
 */
export const ColorButton = memo(({ config }: ColorButtonProps) => {
  const editor = useSlate();
  const { zIndex } = usePopperEditorContext();
  const [open, setOpen] = useState(false);

  // Get current color from editor marks
  // Note: Don't use useMemo here - editor reference is stable but marks change,
  // we need to recalculate on every render triggered by useSlate
  const currentColor = getTextProps(editor, COLOR_MARK, DEFAULT_COLOR);

  // Handle color change from panel
  const handleColorChange = useCallback(
    (isAuto: boolean, color?: string) => {
      setOpen(false);

      if (isAuto) {
        removeTextProps(editor, COLOR_MARK);
      } else if (color) {
        setTextProps(editor, COLOR_MARK, color);
      }
    },
    [editor],
  );

  // Icon style with current color
  const iconStyle = useMemo(() => ({ color: currentColor }), [currentColor]);

  const Icon = config.icon;

  // Popover content with color picker panel
  const popoverContent = useMemo(
    () => (
      <>
        <ColorPickerPanel color={currentColor} onChange={handleColorChange} showAutoButton />
        <PopoverArrow className="fill-background" width={20} height={10} />
      </>
    ),
    [currentColor, handleColorChange],
  );

  return (
    <ToolbarPopoverItem
      tooltip={config.tooltip}
      ariaLabel={config.ariaLabel}
      open={open}
      onOpenChange={setOpen}
      popoverZIndex={zIndex + EDITOR_RICH_ACTION_CONTENT}
      popoverContent={popoverContent}
    >
      <Icon size={ICON_SIZE.DEFAULT} style={iconStyle} />
    </ToolbarPopoverItem>
  );
});

ColorButton.displayName = 'ColorButton';
