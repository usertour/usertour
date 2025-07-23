import { Avatar, AvatarFallback, AvatarImage } from '@usertour-packages/avatar';
import { getGravatarUrl } from '@/utils/avatar';
import { cn, getRandomColor } from '@usertour-packages/utils';

interface UserAvatarProps {
  email: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar = ({ email, name, size = 'md', className }: UserAvatarProps) => {
  const avatarUrl = email ? getGravatarUrl(email) : '';

  // Get initials from name for fallback
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={name || 'User avatar'} />
      <AvatarFallback className={cn(getRandomColor(), 'text-background')}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};
