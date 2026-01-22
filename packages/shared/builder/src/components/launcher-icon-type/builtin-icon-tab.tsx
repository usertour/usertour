import React from 'react';
import { IconsList } from '@usertour-packages/widget';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-packages/tooltip';
import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/tailwind';
import type { BuiltinIconTabProps, IconButtonProps } from './types';

const IconButton = React.memo<IconButtonProps>(({ icon: Icon, text, isSelected, onClick }) => (
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
));
IconButton.displayName = 'IconButton';

export const BuiltinIconTab = React.memo<BuiltinIconTabProps>(({ selectedType, onIconSelect }) => (
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
));
BuiltinIconTab.displayName = 'BuiltinIconTab';
