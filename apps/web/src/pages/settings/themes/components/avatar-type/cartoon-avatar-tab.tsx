import { memo, useCallback } from 'react';

import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

import { getLocalAvatarUrl, LOCAL_AVATARS } from './constants';
import type { CartoonAvatarTabProps } from './types';

interface AvatarButtonProps {
  name: string;
  text: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const AvatarButton = memo<AvatarButtonProps>(({ name, text, isSelected, onClick, disabled }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-12 h-12 p-1 transition-transform hover:scale-110',
          isSelected && 'ring-2 ring-primary ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
        )}
      >
        <img
          src={getLocalAvatarUrl(name)}
          alt={text}
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
      </Button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs bg-foreground">{text}</TooltipContent>
  </Tooltip>
));
AvatarButton.displayName = 'AvatarButton';

export const CartoonAvatarTab = memo<CartoonAvatarTabProps>(
  ({ selectedName, onAvatarSelect, disabled }) => {
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
            {LOCAL_AVATARS.map(({ name, text }) => (
              <AvatarButton
                key={name}
                name={name}
                text={text}
                isSelected={name === selectedName}
                onClick={() => handleSelect(name)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      </TooltipProvider>
    );
  },
);
CartoonAvatarTab.displayName = 'CartoonAvatarTab';
