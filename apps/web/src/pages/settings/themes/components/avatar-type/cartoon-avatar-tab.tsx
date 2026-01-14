import { memo, useCallback } from 'react';
import type { FC } from 'react';

import { AvatarsList } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

import type { CartoonAvatarTabProps } from './types';

interface AvatarButtonProps {
  text: string;
  Avatar: FC<{ size?: number; className?: string }>;
  isSelected: boolean;
  onClick: () => void;
}

const AvatarButton = memo<AvatarButtonProps>(({ text, Avatar, isSelected, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'w-12 h-12 p-1 transition-transform hover:scale-110',
          isSelected && 'ring-2 ring-primary ring-offset-2',
        )}
      >
        <Avatar size={40} className="rounded-full" />
      </Button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs bg-foreground">{text}</TooltipContent>
  </Tooltip>
));
AvatarButton.displayName = 'AvatarButton';

export const CartoonAvatarTab = memo<CartoonAvatarTabProps>(({ selectedName, onAvatarSelect }) => {
  const handleSelect = useCallback(
    (name: string) => {
      onAvatarSelect(name);
    },
    [onAvatarSelect],
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col">
        <div className="grid grid-cols-4 gap-2 p-2 max-h-48 overflow-y-auto">
          {AvatarsList.map(({ name, text, Avatar }) => (
            <AvatarButton
              key={name}
              text={text}
              Avatar={Avatar}
              isSelected={name === selectedName}
              onClick={() => handleSelect(name)}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
});
CartoonAvatarTab.displayName = 'CartoonAvatarTab';
