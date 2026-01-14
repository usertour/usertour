import React from 'react';

import type { AvatarComponent, AvatarListItem, AvatarProps } from './types';

export type { AvatarComponent, AvatarListItem, AvatarProps };

/**
 * CDN base URL for avatar images
 */
export const AVATAR_CDN_BASE_URL = 'https://r3.usertour.io/avatar';

/**
 * Local base path for avatar images (used in web admin)
 */
export const AVATAR_LOCAL_BASE_PATH = '/images/avatar';

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

/**
 * Get the CDN URL for an avatar by name
 * @param name - The avatar name (e.g., 'alex', 'bella')
 * @returns The CDN URL for the avatar
 */
export const getAvatarCdnUrl = (name: string): string => {
  const normalizedName = name.toLowerCase();
  const validName = AVATAR_NAMES.includes(normalizedName as AvatarName) ? normalizedName : 'alex';
  return `${AVATAR_CDN_BASE_URL}/${validName}.svg`;
};

/**
 * Get the local path for an avatar by name (for web admin)
 * @param name - The avatar name (e.g., 'alex', 'bella')
 * @returns The local path for the avatar
 */
export const getAvatarLocalPath = (name: string): string => {
  const normalizedName = name.toLowerCase();
  const validName = AVATAR_NAMES.includes(normalizedName as AvatarName) ? normalizedName : 'alex';
  return `${AVATAR_LOCAL_BASE_PATH}/${validName}.svg`;
};

/**
 * Create an avatar component from a URL
 */
const createAvatarComponent = (url: string, displayName: string): AvatarComponent => {
  const AvatarComponent: AvatarComponent = ({ size = 60, className, style, ...props }) => {
    return React.createElement('img', {
      src: url,
      alt: displayName,
      width: size,
      height: size,
      className,
      style: {
        borderRadius: '50%',
        objectFit: 'cover' as const,
        ...style,
      },
      ...props,
    });
  };
  AvatarComponent.displayName = `${displayName}Avatar`;
  return AvatarComponent;
};

// Create avatar components using CDN URLs
export const AlexAvatar = createAvatarComponent(getAvatarCdnUrl('alex'), 'Alex');
export const BellaAvatar = createAvatarComponent(getAvatarCdnUrl('bella'), 'Bella');
export const ChrisAvatar = createAvatarComponent(getAvatarCdnUrl('chris'), 'Chris');
export const DanielAvatar = createAvatarComponent(getAvatarCdnUrl('daniel'), 'Daniel');
export const EmmaAvatar = createAvatarComponent(getAvatarCdnUrl('emma'), 'Emma');
export const FrankAvatar = createAvatarComponent(getAvatarCdnUrl('frank'), 'Frank');
export const GraceAvatar = createAvatarComponent(getAvatarCdnUrl('grace'), 'Grace');
export const HenryAvatar = createAvatarComponent(getAvatarCdnUrl('henry'), 'Henry');

// Avatar registry for dynamic lookup
const avatarRegistry: Record<string, AvatarComponent> = {
  alex: AlexAvatar,
  bella: BellaAvatar,
  chris: ChrisAvatar,
  daniel: DanielAvatar,
  emma: EmmaAvatar,
  frank: FrankAvatar,
  grace: GraceAvatar,
  henry: HenryAvatar,
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
  { name: 'alex', text: 'Alex', Avatar: AlexAvatar },
  { name: 'bella', text: 'Bella', Avatar: BellaAvatar },
  { name: 'chris', text: 'Chris', Avatar: ChrisAvatar },
  { name: 'daniel', text: 'Daniel', Avatar: DanielAvatar },
  { name: 'emma', text: 'Emma', Avatar: EmmaAvatar },
  { name: 'frank', text: 'Frank', Avatar: FrankAvatar },
  { name: 'grace', text: 'Grace', Avatar: GraceAvatar },
  { name: 'henry', text: 'Henry', Avatar: HenryAvatar },
];
