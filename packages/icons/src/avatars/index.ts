import type { AvatarComponent, AvatarListItem, AvatarProps } from './types';
import {
  AlexAvatar,
  BellaAvatar,
  ChrisAvatar,
  DanielAvatar,
  EmmaAvatar,
  FrankAvatar,
  GraceAvatar,
  HenryAvatar,
} from './avatar-icons';

export type { AvatarComponent, AvatarListItem, AvatarProps };

/**
 * List of all available avatar names
 */
export const AVATAR_NAMES = [
  'alex',
  'bella',
  'chris',
  'daniel',
  'emma',
  'frank',
  'grace',
  'henry',
] as const;

export type AvatarName = (typeof AVATAR_NAMES)[number];

// Re-export inline SVG avatar components from avatar-icons
export {
  AlexAvatar,
  BellaAvatar,
  ChrisAvatar,
  DanielAvatar,
  EmmaAvatar,
  FrankAvatar,
  GraceAvatar,
  HenryAvatar,
};

// Avatar registry for dynamic lookup (assertion: memo avatar components are compatible with AvatarComponent)
const avatarRegistry: Record<string, AvatarComponent> = {
  alex: AlexAvatar as AvatarComponent,
  bella: BellaAvatar as AvatarComponent,
  chris: ChrisAvatar as AvatarComponent,
  daniel: DanielAvatar as AvatarComponent,
  emma: EmmaAvatar as AvatarComponent,
  frank: FrankAvatar as AvatarComponent,
  grace: GraceAvatar as AvatarComponent,
  henry: HenryAvatar as AvatarComponent,
};

/**
 * Get an avatar component by name
 * @param name - The avatar name (e.g., 'alex', 'bella')
 * @returns The avatar component or undefined if not found
 */
export const getAvatar = (name: string): AvatarComponent | undefined => {
  return avatarRegistry[name.toLowerCase()];
};

/**
 * Get all registered avatar names
 * @returns Array of avatar names
 */
export const getAvatarNames = (): string[] => {
  return Object.keys(avatarRegistry);
};

/**
 * List of all available avatars for rendering selection UI
 */
export const AvatarsList: AvatarListItem[] = [
  { name: 'alex', text: 'Alex', Avatar: AlexAvatar as AvatarComponent },
  { name: 'bella', text: 'Bella', Avatar: BellaAvatar as AvatarComponent },
  { name: 'chris', text: 'Chris', Avatar: ChrisAvatar as AvatarComponent },
  { name: 'daniel', text: 'Daniel', Avatar: DanielAvatar as AvatarComponent },
  { name: 'emma', text: 'Emma', Avatar: EmmaAvatar as AvatarComponent },
  { name: 'frank', text: 'Frank', Avatar: FrankAvatar as AvatarComponent },
  { name: 'grace', text: 'Grace', Avatar: GraceAvatar as AvatarComponent },
  { name: 'henry', text: 'Henry', Avatar: HenryAvatar as AvatarComponent },
];
