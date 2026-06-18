'use client';

import { EDITOR_RICH_ACTION_CONTENT } from '@usertour/constants';
import { PopoverArrow, ColorPickerPanel } from '@usertour/ui';
import { useCurrentUserId } from '@usertour/hooks';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const userId = useCurrentUserId();
  const { t } = useTranslation();

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

  const Icon = config.icon;

  // Popover content with color picker panel
  const popoverContent = useMemo(
    () => (
      <>
        <ColorPickerPanel
          color={currentColor}
          onChange={handleColorChange}
          showAutoButton
          userId={userId}
          labels={{
            useThisColor: t('common.colorPicker.useThisColor'),
            removeColor: t('common.colorPicker.removeColor'),
            tailwindColors: t('common.colorPicker.tailwindColors'),
            recentlyUsed: t('common.colorPicker.recentlyUsed'),
            done: t('common.colorPicker.done'),
            colorPicker: t('common.colorPicker.colorPicker'),
            colorPalette: t('common.colorPicker.colorPalette'),
          }}
        />
        <PopoverArrow className="fill-background" width={20} height={10} />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentColor, handleColorChange, userId, t],
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
      <div className="flex flex-col items-center justify-center h-full">
        <Icon size={ICON_SIZE.COLOR} />
        <div className="w-4 h-0.5 rounded-sm" style={{ backgroundColor: currentColor }} />
      </div>
    </ToolbarPopoverItem>
  );
});

ColorButton.displayName = 'ColorButton';
