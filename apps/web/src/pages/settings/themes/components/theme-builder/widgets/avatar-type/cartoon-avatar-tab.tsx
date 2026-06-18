import { memo, useCallback } from 'react';

import { AvatarsList, type AvatarComponent } from '@usertour/icons';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/ui';
import { cn } from '@usertour/tailwind';

import type { CartoonAvatarTabProps } from './types';

interface AvatarButtonProps {
  name: string;
  text: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  Avatar: AvatarComponent;
}

const AvatarButton = memo<AvatarButtonProps>((props) => {
  const { text, isSelected, onClick, disabled, Avatar } = props;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'w-12 h-12 p-1 transition-transform hover:scale-110',
            isSelected && 'bg-accent',
            disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
          )}
        >
          <Avatar size={40} className="rounded-full object-cover" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
});
AvatarButton.displayName = 'AvatarButton';

export const CartoonAvatarTab = memo<CartoonAvatarTabProps>((props) => {
  const { selectedName, onAvatarSelect, disabled } = props;
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
              name={name}
              text={text}
              Avatar={Avatar}
              isSelected={name === selectedName}
              onClick={() => handleSelect(name)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
});
CartoonAvatarTab.displayName = 'CartoonAvatarTab';
