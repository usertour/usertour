import sha256 from 'crypto-js/sha256';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { cn } from '@usertour/tailwind';

// Inlined gravatar URL helper — was `apps/web/src/utils/avatar.ts`, moved
// here so this primitive can live in @usertour/ui without reaching back
// into the app. Gravatar accepts a lowercased trimmed email hashed with
// SHA-256 and rendered as a hex digest.
const getGravatarUrl = (email: string, size = 80): string => {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = sha256(trimmedEmail);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
};

interface UserAvatarProps {
  email: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar = ({ email, name, size = 'md', className }: UserAvatarProps) => {
  const avatarUrl = email ? getGravatarUrl(email) : '';

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
      <AvatarFallback className={cn('bg-primary/80', 'text-background')}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};
