import { Avatar, AvatarFallback } from '@usertour-packages/avatar';
import { cn } from '@usertour-packages/tailwind';

interface InitialsAvatarProps {
  seed?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GRADIENT_PAIRS: [string, string][] = [
  ['#6366f1', '#a855f7'],
  ['#3b82f6', '#06b6d4'],
  ['#06b6d4', '#14b8a6'],
  ['#14b8a6', '#10b981'],
  ['#10b981', '#84cc16'],
  ['#f59e0b', '#f97316'],
  ['#f97316', '#ef4444'],
  ['#ef4444', '#ec4899'],
  ['#ec4899', '#f43f5e'],
  ['#d946ef', '#ec4899'],
  ['#a855f7', '#d946ef'],
  ['#8b5cf6', '#6366f1'],
  ['#0ea5e9', '#3b82f6'],
  ['#22c55e', '#14b8a6'],
  ['#eab308', '#f59e0b'],
  ['#ef4444', '#f43f5e'],
];

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-12 w-12 text-base',
};

const hashToIndex = (input: string, modulo: number) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
};

const getInitials = (name?: string, seed?: string) => {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (seed) {
    const firstLetter = seed.match(/\p{L}/u);
    if (firstLetter) return firstLetter[0].toUpperCase();
    const firstDigit = seed.match(/\p{N}/u);
    if (firstDigit) return firstDigit[0];
  }
  return 'U';
};

export const InitialsAvatar = ({ seed, name, size = 'md', className }: InitialsAvatarProps) => {
  const colorSeed = (seed || name || '').toLowerCase();
  const gradient = colorSeed ? GRADIENT_PAIRS[hashToIndex(colorSeed, GRADIENT_PAIRS.length)] : null;
  const style = gradient
    ? { backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }
    : undefined;

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback
        className={cn('text-white font-medium', !gradient && 'bg-muted')}
        style={style}
      >
        {getInitials(name, seed)}
      </AvatarFallback>
    </Avatar>
  );
};
