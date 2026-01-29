import type { ComponentType, SVGProps } from 'react';

/**
 * Avatar component props
 */
export interface AvatarProps extends SVGProps<SVGSVGElement> {
  /** Avatar size in pixels */
  size?: number;
}

/**
 * Avatar component type (ComponentType allows memo-wrapped components)
 */
export type AvatarComponent = ComponentType<AvatarProps>;

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
