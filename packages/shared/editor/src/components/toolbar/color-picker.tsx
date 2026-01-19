import { RiFontColor } from '@usertour-packages/icons';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ColorPickerPanel } from '@usertour-packages/shared-components';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { memo, useCallback, useMemo, useState } from 'react';
import { useSlate } from 'slate-react';
import { getTextProps, removeTextProps, setTextProps } from '../../lib/text';

// Constants
const COLOR_MARK = 'color';
const DEFAULT_COLOR = '#000000';
const ICON_SIZE = 15;
const TOOLTIP_TEXT = 'Font color';

// Toolbar button styles matching other toolbar items
const TRIGGER_CLASS_NAME =
  'flex-shrink-0 flex-grow-0 basis-auto text-mauve11 h-[25px] px-[5px] rounded ' +
  'inline-flex text-[13px] leading-none items-center justify-center ml-0.5 outline-none ' +
  'hover:bg-violet3 hover:text-violet11 focus:relative focus:shadow-[0_0_0_2px] ' +
  'focus:shadow-violet7 first:ml-0 text-slate-900';

// Prevent focus returning to trigger after closing
const preventAutoFocus = (e: Event) => e.preventDefault();

export const ColorPicker = memo(() => {
  const editor = useSlate();
  const [open, setOpen] = useState(false);

  // Get current color from editor marks
  const currentColor = useMemo(() => getTextProps(editor, COLOR_MARK, DEFAULT_COLOR), [editor]);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger className={TRIGGER_CLASS_NAME}>
              <RiFontColor size={ICON_SIZE} style={iconStyle} />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{TOOLTIP_TEXT}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent sideOffset={5} className="w-auto p-0" onCloseAutoFocus={preventAutoFocus}>
        <ColorPickerPanel color={currentColor} onChange={handleColorChange} showAutoButton />
        <PopoverArrow className="fill-background" />
      </PopoverContent>
    </Popover>
  );
});

ColorPicker.displayName = 'ColorPicker';
