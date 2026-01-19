'use client';

import { Button } from '@usertour-packages/button';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { isNearWhite, needsDarkText } from '@usertour/helpers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColorPickerPanel } from './color-picker-panel';
import type { ColorPickerProps } from './types';

export const ColorPicker = (props: ColorPickerProps) => {
  const {
    defaultColor,
    onChange,
    isAutoColor = false,
    className = '',
    autoColor = '',
    showAutoButton = false,
    disabled = false,
  } = props;
  const [color, setColor] = useState<string>(isAutoColor ? autoColor : defaultColor);
  const [isAuto, setIsAuto] = useState(isAutoColor);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuto && autoColor) {
      setColor(autoColor);
    }
  }, [autoColor, isAuto]);

  const handleColorChange = useCallback(
    (isAutoValue: boolean, newColor = '') => {
      setOpen(false);
      setIsAuto(isAutoValue);
      if (!isAutoValue && newColor) {
        setColor(newColor);
      }
      onChange?.(isAutoValue ? 'Auto' : newColor);
    },
    [onChange],
  );

  const buttonClassName = useMemo(
    () =>
      cn(
        'w-full border text-opacity-50 hover:text-opacity-100 disabled:opacity-100',
        needsDarkText(color) ? 'text-black' : 'text-white',
        isNearWhite(color) ? 'border-slate-300' : '',
        className,
      ),
    [color, className],
  );

  const buttonStyle = useMemo(
    () => ({
      background: color,
      borderColor: isNearWhite(color) ? undefined : color,
    }),
    [color],
  );

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button className={buttonClassName} style={buttonStyle} disabled={disabled}>
          {isAuto ? 'Auto' : color.toLowerCase()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={5}
        className="w-full border-none bg-transparent p-0 shadow-none drop-shadow-popover"
      >
        <ColorPickerPanel
          color={color}
          isAuto={isAuto}
          onChange={handleColorChange}
          showAutoButton={showAutoButton}
        />
        <PopoverArrow className="fill-background" width={20} height={10} />
      </PopoverContent>
    </Popover>
  );
};

ColorPicker.displayName = 'ColorPicker';
