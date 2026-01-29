'use client';

import { Button } from '@usertour-packages/button';
import { StorageKeys } from '@usertour-packages/constants';
import { CheckboxIcon, Delete2Icon, EditIcon, RemoveColorIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { useCurrentUserId } from '@usertour-packages/shared-hooks';
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
import { cn } from '@usertour-packages/tailwind';
import { firstLetterToUpperCase } from '@usertour/helpers';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { HexColorPicker } from 'react-colorful';
import type { ColorButtonProps, ColorPickerPanelProps } from './types';
import {
  formatColorTooltip,
  getRecentColors,
  HEX_ERROR_MESSAGE,
  isValidHexColor,
  normalizeHexColor,
  removeRecentColor,
  saveRecentColor,
  SELECTED_COLOR_LEVELS,
  tailwindColorData,
  TAILWIND_DOCS_URL,
} from './utils';

// ============================================================================
// Sub Components
// ============================================================================

// Simple tooltip wrapper for icons
const IconTooltip = React.memo(
  ({ tooltip, children }: { tooltip: string; children: React.ReactNode }) => (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs bg-foreground">{tooltip}</TooltipContent>
    </Tooltip>
  ),
);
IconTooltip.displayName = 'IconTooltip';

// Color button used in both Tailwind palette and recent colors
const ColorButton = React.memo(({ color, tooltip, onClick, children }: ColorButtonProps) => (
  <IconTooltip tooltip={tooltip}>
    <Button
      variant="outline"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="w-full aspect-square h-auto rounded-none transition-transform hover:scale-125 hover:bg-transparent"
      style={{ backgroundColor: color, borderColor: color }}
    >
      {children}
    </Button>
  </IconTooltip>
));
ColorButton.displayName = 'ColorButton';

// Error popover for invalid hex input
const ErrorPopover = React.memo(
  ({
    error,
    children,
  }: {
    error?: string;
    children: React.ReactNode;
  }) => {
    if (!error) return <>{children}</>;

    return (
      <Tooltip open={!!error}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="bg-destructive text-destructive-foreground border-0"
        >
          {error}
        </TooltipContent>
      </Tooltip>
    );
  },
);
ErrorPopover.displayName = 'ErrorPopover';

// Color input section at the top
const ColorInput = React.memo(
  ({
    inputColor,
    displayColor,
    isAuto,
    showAutoButton,
    error,
    onInputChange,
    onSubmit,
    onRemove,
  }: {
    inputColor: string;
    displayColor: string;
    isAuto: boolean;
    showAutoButton: boolean;
    error?: string;
    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    onRemove: () => void;
  }) => (
    <div className="flex flex-row items-center gap-2">
      <div className="w-6 h-6 shrink-0 rounded border" style={{ backgroundColor: displayColor }} />
      <ErrorPopover error={error}>
        <Input
          value={!isAuto ? inputColor : ''}
          className={cn('h-8 grow', error && 'border-destructive focus-visible:ring-destructive')}
          placeholder={isAuto ? displayColor : ''}
          onChange={onInputChange}
        />
      </ErrorPopover>
      <IconTooltip tooltip="Use this color">
        <Button variant="ghost" size="icon" onClick={onSubmit} className="h-7 w-7 text-primary">
          <CheckboxIcon width={20} height={20} />
        </Button>
      </IconTooltip>
      {showAutoButton && (
        <IconTooltip tooltip="Remove color(use default)">
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7 shrink-0">
            <RemoveColorIcon width={16} height={16} />
          </Button>
        </IconTooltip>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEditToggle(false);
                }}
                className="h-6 p-0"
              >
                Done
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditToggle(true);
                }}
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
// Main Component
// ============================================================================

export const ColorPickerPanel = (props: ColorPickerPanelProps) => {
  const { color = '', onChange, isAuto = false, showAutoButton = true } = props;
  const uid = useCurrentUserId();
  const [inputColor, setInputColor] = useState(!isAuto ? color : '');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isEditingRecent, setIsEditingRecent] = useState(false);
  const [inputError, setInputError] = useState<string | undefined>(undefined);

  // Build user-specific storage key
  const storageKey = useMemo(
    () => (uid ? `${StorageKeys.COLOR_PICKER_RECENT}-${uid}` : StorageKeys.COLOR_PICKER_RECENT),
    [uid],
  );

  // Load recent colors on mount or when storageKey changes
  useEffect(() => {
    setRecentColors(getRecentColors(storageKey));
  }, [storageKey]);

  const displayColor = useMemo(() => inputColor || color, [inputColor, color]);

  const handleSubmit = useCallback(() => {
    // Validate on submit
    if (inputColor && !isValidHexColor(inputColor)) {
      setInputError(HEX_ERROR_MESSAGE);
      return;
    }
    setInputError(undefined);
    if (inputColor) {
      // Normalize #rgb to #rrggbb format
      const normalizedColor = normalizeHexColor(inputColor);
      const updated = saveRecentColor(storageKey, normalizedColor);
      setRecentColors(updated);
      onChange(false, normalizedColor);
    } else {
      onChange(true, '');
    }
  }, [inputColor, onChange, storageKey]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setInputColor(e.target.value);
      // Clear error when user starts typing
      if (inputError) {
        setInputError(undefined);
      }
    },
    [inputError],
  );

  const handleRemoveColor = useCallback(() => {
    onChange(true);
  }, [onChange]);

  const handleColorSelect = useCallback(
    (selectedColor: string) => {
      const updated = saveRecentColor(storageKey, selectedColor);
      setRecentColors(updated);
      onChange(false, selectedColor);
    },
    [onChange, storageKey],
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

  const handleRemoveRecentColor = useCallback(
    (colorToRemove: string) => {
      const updated = removeRecentColor(storageKey, colorToRemove);
      setRecentColors(updated);
      if (updated.length === 0) {
        setIsEditingRecent(false);
      }
    },
    [storageKey],
  );

  const handleEditToggle = useCallback((editing: boolean) => {
    setIsEditingRecent(editing);
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-background p-4 rounded space-y-3 w-64">
        <ColorInput
          inputColor={inputColor}
          displayColor={displayColor}
          isAuto={isAuto}
          showAutoButton={showAutoButton}
          error={inputError}
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
            <div className="h-64 color-picker-panel">
              <HexColorPicker
                color={displayColor}
                onChange={handleColorfulChange}
                className="!w-full !h-full !gap-2"
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

ColorPickerPanel.displayName = 'ColorPickerPanel';
