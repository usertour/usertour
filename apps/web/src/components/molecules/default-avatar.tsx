import { cn } from '@usertour-packages/tailwind';
import {
  RiAliensFill,
  RiBearSmileFill,
  RiBlazeFill,
  RiChessFill,
  RiGame2Fill,
  RiGhost2Fill,
  RiGhostSmileFill,
  RiMeteorFill,
  RiMoonClearFill,
  RiRobotFill,
  RiRobot2Fill,
  RiRobot3Fill,
  RiSparkling2Fill,
  RiSpyFill,
  RiStarSmileFill,
} from '@usertour-packages/icons';

interface DefaultAvatarProps {
  /** Stable identifier (id / email / externalId) used to deterministically pick the icon + color */
  seed?: string;
  /** Optional display name; only used for the aria-label */
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICONS = [
  RiAliensFill,
  RiBearSmileFill,
  RiBlazeFill,
  RiChessFill,
  RiGame2Fill,
  RiGhost2Fill,
  RiGhostSmileFill,
  RiMeteorFill,
  RiMoonClearFill,
  RiRobotFill,
  RiRobot2Fill,
  RiRobot3Fill,
  RiSparkling2Fill,
  RiSpyFill,
  RiStarSmileFill,
];

const COLORS = [
  'bg-blue-500/15 text-blue-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-amber-500/15 text-amber-600',
  'bg-rose-500/15 text-rose-600',
  'bg-violet-500/15 text-violet-600',
  'bg-sky-500/15 text-sky-600',
  'bg-orange-500/15 text-orange-600',
  'bg-teal-500/15 text-teal-600',
];

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const iconSizeMap = {
  sm: 14,
  md: 18,
  lg: 28,
};

const hashCode = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/**
 * Default avatar for entities without a real photo (BizUser / BizCompany).
 * Renders a curated character / symbol icon picked deterministically from
 * `seed`, on a soft tinted background also picked from `seed` so the same
 * user always shows the same icon + color.
 */
export const DefaultAvatar = ({ seed, name, size = 'md', className }: DefaultAvatarProps) => {
  const key = (seed || name || '').toLowerCase();
  const h = hashCode(key);
  const Icon = ICONS[h % ICONS.length];
  const colorClass = COLORS[Math.floor(h / ICONS.length) % COLORS.length];

  return (
    <div
      role="img"
      aria-label={name || seed || 'avatar'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        sizeClasses[size],
        colorClass,
        className,
      )}
    >
      <Icon size={iconSizeMap[size]} />
    </div>
  );
};

DefaultAvatar.displayName = 'DefaultAvatar';
