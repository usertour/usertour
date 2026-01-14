import type { FC, SVGProps } from 'react';

/**
 * Avatar component props
 */
export interface AvatarProps extends SVGProps<SVGSVGElement> {
  /** Avatar size in pixels */
  size?: number;
}

/**
 * Avatar component type
 */
export type AvatarComponent = FC<AvatarProps>;

/**
 * Avatar list item for rendering avatar selection grid
 */
export interface AvatarListItem {
  /** Unique avatar name identifier */
  name: string;
  /** Display text for the avatar */
  text: string;
  /** Avatar component */
  Avatar: AvatarComponent;
}
