import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Button } from '@usertour-packages/button';
import { TAILWINDCSS_COLORS } from '@usertour-packages/constants';
import { CheckboxIcon, RemoveColorIcon, Delete2Icon, EditIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import {
  Tabs,
  UnderlineTabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
} from '@usertour-packages/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { cn } from '@usertour/helpers';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { firstLetterToUpperCase } from '@/utils/common';
import { isNearWhite, needsDarkText } from '@/utils/theme';

// ============================================================================
// Constants
// ============================================================================

const RECENT_COLORS_KEY = 'theme-color-picker-recent';
const MAX_RECENT_COLORS = 20;
const TAILWIND_DOCS_URL = 'https://tailwindcss.com/docs/customizing-colors';

const SELECTED_COLOR_SERIES = [
  'slate',
  'neutral',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'blue',
  'purple',
  'pink',
] as const;

const SELECTED_COLOR_LEVELS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
] as const;

// ============================================================================
// Types
// ============================================================================

type TailwindColorData = {
  name: string;
  level: string;
  color: string;
};

type PickerProps = {
  color?: string;
  isAuto?: boolean;
  showAutoButton?: boolean;
  onChange: (isAuto: boolean, color?: string) => void;
};

type ColorButtonProps = {
  color: string;
  tooltip: string;
  onClick: () => void;
  children?: React.ReactNode;
};

type ThemeColorPickerProps = {
  defaultColor: string;
  autoColor?: string;
  isAutoColor?: boolean;
  showAutoButton?: boolean;
  onChange?: (color: string) => void;
  className?: string;
};

// ============================================================================
// Utility Functions
// ============================================================================

const getRecentColors = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentColor = (color: string): string[] => {
  const recent = getRecentColors();
  const normalized = color.toLowerCase();
  const filtered = recent.filter((c) => c.toLowerCase() !== normalized);
  const updated = [normalized, ...filtered].slice(0, MAX_RECENT_COLORS);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  return updated;
};

const removeRecentColor = (colorToRemove: string): string[] => {
  const recent = getRecentColors();
  const updated = recent.filter((c) => c.toLowerCase() !== colorToRemove.toLowerCase());
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  return updated;
};

// ============================================================================
// Color Data Processing
// ============================================================================

const formatTailwindColorData = (
  colors: Record<string, Record<string, string>>,
): TailwindColorData[][] => {
  const rows: TailwindColorData[][] = [];
  for (const colorName of SELECTED_COLOR_SERIES) {
    const colorSeries = colors[colorName];
    if (!colorSeries) continue;
    const cols: TailwindColorData[] = [];
    for (const level of SELECTED_COLOR_LEVELS) {
      const color = colorSeries[level];
      if (color) {
        cols.push({ name: colorName, level, color });
      }
    }
    rows.push(cols);
  }
  return rows;
};

const tailwindColorData = formatTailwindColorData(TAILWINDCSS_COLORS);

// Create a map for quick lookup of Tailwind colors by hex value
const tailwindColorMap = new Map<string, TailwindColorData>(
  tailwindColorData.flatMap((row) => row.map((col) => [col.color.toLowerCase(), col])),
);

const getTailwindColorInfo = (hex: string): TailwindColorData | undefined => {
  return tailwindColorMap.get(hex.toLowerCase());
};

const formatColorTooltip = (hex: string): string => {
  const tailwindInfo = getTailwindColorInfo(hex);
  if (tailwindInfo) {
    return `Tailwind ${firstLetterToUpperCase(tailwindInfo.name)} ${tailwindInfo.level}: ${tailwindInfo.color}`;
  }
  return hex;
};

// ============================================================================
// Sub Components
// ============================================================================

// Color button used in both Tailwind palette and recent colors
const ColorButton = React.memo(({ color, tooltip, onClick, children }: ColorButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        className="w-full aspect-square h-auto rounded-none transition-transform hover:scale-125 hover:bg-transparent"
        style={{ backgroundColor: color, borderColor: color }}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs bg-slate-700">{tooltip}</TooltipContent>
  </Tooltip>
));
ColorButton.displayName = 'ColorButton';

// Color input section at the top
const ColorInput = React.memo(
  ({
    inputColor,
    displayColor,
    isAuto,
    showAutoButton,
    onInputChange,
    onSubmit,
    onRemove,
  }: {
    inputColor: string;
    displayColor: string;
    isAuto: boolean;
    showAutoButton: boolean;
    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    onRemove: () => void;
  }) => (
    <div className="flex flex-row items-center gap-2">
      <div className="w-6 h-6 shrink-0 rounded border" style={{ backgroundColor: displayColor }} />
      <Input
        value={!isAuto ? inputColor : ''}
        className="h-8 grow"
        placeholder={isAuto ? displayColor : ''}
        onChange={onInputChange}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <CheckboxIcon
            width={28}
            height={28}
            onClick={onSubmit}
            className="text-primary cursor-pointer"
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-700">Use this color</TooltipContent>
      </Tooltip>
      {showAutoButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <RemoveColorIcon
              width={20}
              height={20}
              onClick={onRemove}
              className="cursor-pointer shrink-0"
            />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-slate-700">
            Remove color(use default)
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  ),
);
ColorInput.displayName = 'ColorInput';

// Tailwind color palette grid
const TailwindPalette = React.memo(
  ({ onColorClick }: { onColorClick: (color: string) => void }) => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">Tailwind CSS colors</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary hover:text-primary"
          asChild
        >
          <a href={TAILWIND_DOCS_URL} target="_blank" rel="noopener noreferrer">
            <OpenInNewWindowIcon className="size-3.5" />
          </a>
        </Button>
      </div>
      <div className="grid grid-cols-10 gap-px flex-1 content-start">
        {SELECTED_COLOR_LEVELS.map((level) =>
          tailwindColorData.map((row, index) => {
            const col = row.find((c) => c.level === level);
            if (!col) return null;
            return (
              <ColorButton
                key={`${index}-${level}`}
                color={col.color}
                tooltip={`Tailwind ${firstLetterToUpperCase(col.name)} ${col.level}: ${col.color}`}
                onClick={() => onColorClick(col.color)}
              />
            );
          }),
        )}
      </div>
    </div>
  ),
);
TailwindPalette.displayName = 'TailwindPalette';

// Recently used colors section
const RecentColors = React.memo(
  ({
    colors,
    isEditing,
    onEditToggle,
    onColorClick,
    onColorRemove,
  }: {
    colors: string[];
    isEditing: boolean;
    onEditToggle: (editing: boolean) => void;
    onColorClick: (color: string) => void;
    onColorRemove: (color: string) => void;
  }) => {
    if (colors.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Recently used</span>
          <div className="w-10 flex justify-end">
            {isEditing ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => onEditToggle(false)}
                className="h-6 p-0"
              >
                Done
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditToggle(true)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <EditIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-10 gap-px">
          {colors.map((color) => (
            <ColorButton
              key={color}
              color={color}
              tooltip={formatColorTooltip(color)}
              onClick={() => (isEditing ? onColorRemove(color) : onColorClick(color))}
            >
              {isEditing && <Delete2Icon className="w-3 h-3 text-white drop-shadow-sm" />}
            </ColorButton>
          ))}
        </div>
      </div>
    );
  },
);
RecentColors.displayName = 'RecentColors';

// ============================================================================
// Main Components
// ============================================================================

const Picker = (props: PickerProps) => {
  const { color = '', onChange, isAuto = false, showAutoButton = true } = props;
  const [inputColor, setInputColor] = useState(!isAuto ? color : '');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isEditingRecent, setIsEditingRecent] = useState(false);

  // Load recent colors on mount
  useEffect(() => {
    setRecentColors(getRecentColors());
  }, []);

  const displayColor = useMemo(() => inputColor || color, [inputColor, color]);

  const handleSubmit = useCallback(() => {
    if (inputColor) {
      const updated = saveRecentColor(inputColor);
      setRecentColors(updated);
      onChange(false, inputColor);
    } else {
      onChange(true, '');
    }
  }, [inputColor, onChange]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputColor(e.target.value);
  }, []);

  const handleRemoveColor = useCallback(() => {
    onChange(true);
  }, [onChange]);

  const handleColorSelect = useCallback(
    (selectedColor: string) => {
      const updated = saveRecentColor(selectedColor);
      setRecentColors(updated);
      onChange(false, selectedColor);
    },
    [onChange],
  );

  const handleColorfulChange = useCallback((hex: string) => {
    setInputColor(hex);
  }, []);

  const handleRecentColorClick = useCallback(
    (selectedColor: string) => {
      onChange(false, selectedColor);
    },
    [onChange],
  );

  const handleRemoveRecentColor = useCallback((colorToRemove: string) => {
    const updated = removeRecentColor(colorToRemove);
    setRecentColors(updated);
    if (updated.length === 0) {
      setIsEditingRecent(false);
    }
  }, []);

  const handleEditToggle = useCallback((editing: boolean) => {
    setIsEditingRecent(editing);
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-background p-4 rounded space-y-3 w-72">
        <ColorInput
          inputColor={inputColor}
          displayColor={displayColor}
          isAuto={isAuto}
          showAutoButton={showAutoButton}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onRemove={handleRemoveColor}
        />
        <Tabs defaultValue="picker">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="picker">Color picker</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="palette">Color palette</UnderlineTabsTrigger>
          </UnderlineTabsList>
          <UnderlineTabsContent value="picker">
            <div className="h-72 theme-color-picker">
              <HexColorPicker
                color={displayColor}
                onChange={handleColorfulChange}
                className="!h-full !gap-2"
              />
            </div>
          </UnderlineTabsContent>
          <UnderlineTabsContent value="palette">
            <TailwindPalette onColorClick={handleColorSelect} />
          </UnderlineTabsContent>
        </Tabs>
        <RecentColors
          colors={recentColors}
          isEditing={isEditingRecent}
          onEditToggle={handleEditToggle}
          onColorClick={handleRecentColorClick}
          onColorRemove={handleRemoveRecentColor}
        />
      </div>
    </TooltipProvider>
  );
};

export const ThemeColorPicker = (props: ThemeColorPickerProps) => {
  const {
    defaultColor,
    onChange,
    isAutoColor = false,
    className = '',
    autoColor = '',
    showAutoButton = false,
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
        'w-full border text-opacity-60 hover:text-opacity-100',
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className={buttonClassName} style={buttonStyle}>
          {isAuto ? 'Auto' : color.toLowerCase()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={5}
        className="z-50 w-full p-0"
        style={{
          filter:
            'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
        }}
      >
        <Picker
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

ThemeColorPicker.displayName = 'ThemeColorPicker';
