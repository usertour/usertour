import React, { useState } from 'react';
import { IconsList } from '@usertour-packages/sdk';
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@usertour-packages/popover';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
} from '@usertour-packages/tabs';
import { Button } from '@usertour-packages/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { cn } from '@usertour-packages/tailwind';

interface LauncherIconTypeProps {
  type: string;
  zIndex: number;
  onChange: (value: string) => void;
}

// Icon button component for grid items
const IconButton = React.memo(
  ({
    icon: Icon,
    text,
    isSelected,
    onClick,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>;
    text: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={cn(
            'w-full aspect-square h-auto transition-transform hover:scale-125',
            isSelected && 'bg-accent',
          )}
        >
          <Icon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-foreground">{text}</TooltipContent>
    </Tooltip>
  ),
);
IconButton.displayName = 'IconButton';

// Icon grid component similar to TailwindPalette
const IconGrid = React.memo(
  ({
    selectedType,
    onIconSelect,
  }: {
    selectedType: string;
    onIconSelect: (name: string) => void;
  }) => (
    <div className="flex flex-col">
      <div className="grid grid-cols-10 gap-px flex-1 content-start max-h-72 overflow-y-auto p-1">
        {IconsList.map(({ ICON, name, text }) => (
          <IconButton
            key={name}
            icon={ICON}
            text={text}
            isSelected={name === selectedType}
            onClick={() => onIconSelect(name)}
          />
        ))}
      </div>
    </div>
  ),
);
IconGrid.displayName = 'IconGrid';

export const LauncherIconType = ({ type, zIndex, onChange }: LauncherIconTypeProps) => {
  const [open, setOpen] = useState(false);
  const ActiveIcon = IconsList.find((item) => item.name === type)?.ICON;
  const activeText = IconsList.find((item) => item.name === type)?.text ?? type;

  const handleIconSelect = (selectedName: string) => {
    onChange(selectedName);
    setOpen(false);
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start flex h-8 w-full" style={{ zIndex }}>
            {ActiveIcon && <ActiveIcon size={16} />}
            <div className="grow text-left ml-2">
              <span className="capitalize">{activeText}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={5}
          className="z-50 w-full p-0"
          style={{
            zIndex: zIndex + 1,
            filter:
              'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
          }}
        >
          <div className="bg-background p-4 rounded space-y-3 w-80">
            <Tabs defaultValue="builtin">
              <UnderlineTabsList>
                <UnderlineTabsTrigger value="builtin">Built-in icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="upload">Upload icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="url">Enter URL</UnderlineTabsTrigger>
              </UnderlineTabsList>
              <UnderlineTabsContent value="builtin">
                <IconGrid selectedType={type} onIconSelect={handleIconSelect} />
              </UnderlineTabsContent>
              <UnderlineTabsContent value="upload">
                <div className="py-4 text-sm text-muted-foreground text-center">
                  Upload icon feature coming soon
                </div>
              </UnderlineTabsContent>
              <UnderlineTabsContent value="url">
                <div className="py-4 text-sm text-muted-foreground text-center">
                  Enter URL feature coming soon
                </div>
              </UnderlineTabsContent>
            </Tabs>
          </div>
          <PopoverArrow className="fill-background" width={20} height={10} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
LauncherIconType.displayName = 'LauncherIconType';
