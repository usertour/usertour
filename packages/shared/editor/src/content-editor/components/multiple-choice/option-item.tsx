// Shared option item component for both radio and checkbox modes

import { cn } from '@usertour-packages/tailwind';
import { memo } from 'react';

import { OPTION_ITEM_BASE_CLASS } from './constants';

interface OptionItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const OptionItem = memo(({ children, className, onClick }: OptionItemProps) => (
  <div className={cn(OPTION_ITEM_BASE_CLASS, className)} onClick={onClick}>
    {children}
  </div>
));

OptionItem.displayName = 'OptionItem';
