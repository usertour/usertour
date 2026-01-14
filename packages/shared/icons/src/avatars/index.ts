import React from 'react';

import {
  ALEX_AVATAR_DATA,
  BELLA_AVATAR_DATA,
  CHRIS_AVATAR_DATA,
  DANIEL_AVATAR_DATA,
  EMMA_AVATAR_DATA,
  FRANK_AVATAR_DATA,
  GRACE_AVATAR_DATA,
  HENRY_AVATAR_DATA,
} from './avatar-data';
import type { AvatarComponent, AvatarListItem, AvatarProps } from './types';

export type { AvatarComponent, AvatarListItem, AvatarProps };

/**
 * Create an avatar component from a data URI
 */
const createAvatarComponent = (dataUri: string, displayName: string): AvatarComponent => {
  const AvatarComponent: AvatarComponent = ({ size = 60, className, style, ...props }) => {
    return React.createElement('img', {
      src: dataUri,
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

// Create avatar components
export const AlexAvatar = createAvatarComponent(ALEX_AVATAR_DATA, 'Alex');
export const BellaAvatar = createAvatarComponent(BELLA_AVATAR_DATA, 'Bella');
export const ChrisAvatar = createAvatarComponent(CHRIS_AVATAR_DATA, 'Chris');
export const DanielAvatar = createAvatarComponent(DANIEL_AVATAR_DATA, 'Daniel');
export const EmmaAvatar = createAvatarComponent(EMMA_AVATAR_DATA, 'Emma');
export const FrankAvatar = createAvatarComponent(FRANK_AVATAR_DATA, 'Frank');
export const GraceAvatar = createAvatarComponent(GRACE_AVATAR_DATA, 'Grace');
export const HenryAvatar = createAvatarComponent(HENRY_AVATAR_DATA, 'Henry');

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

// Avatar data URI registry for direct access
const avatarDataRegistry: Record<string, string> = {
  alex: ALEX_AVATAR_DATA,
  bella: BELLA_AVATAR_DATA,
  chris: CHRIS_AVATAR_DATA,
  daniel: DANIEL_AVATAR_DATA,
  emma: EMMA_AVATAR_DATA,
  frank: FRANK_AVATAR_DATA,
  grace: GRACE_AVATAR_DATA,
  henry: HENRY_AVATAR_DATA,
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
 * Get an avatar data URI by name
 * @param name - The avatar name (e.g., 'alex', 'bella')
 * @returns The avatar data URI or undefined if not found
 */
export const getAvatarDataUri = (name: string): string | undefined => {
  return avatarDataRegistry[name.toLowerCase()];
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
