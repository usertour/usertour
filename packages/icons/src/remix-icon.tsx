import type { RemixiconComponentType } from '@remixicon/react';

// Icon registry for dynamic icon lookup by name
// This allows SDK to dynamically select icons by string name
export type IconRegistry = Record<string, RemixiconComponentType>;

// Create an icon registry that maps icon names to components
// Users can register icons dynamically, and SDK can look them up by name
const iconRegistry: IconRegistry = {};

/**
 * Register an icon in the registry
 * @param name - The name identifier for the icon (e.g., 'home-line', 'settings-fill')
 * @param icon - The RemixIcon component
 */
export const registerIcon = (name: string, icon: RemixiconComponentType): void => {
  iconRegistry[name] = icon;
};

/**
 * Register multiple icons at once
 * @param icons - Object mapping names to icon components
 */
export const registerIcons = (icons: Record<string, RemixiconComponentType>): void => {
  Object.assign(iconRegistry, icons);
};

/**
 * Get an icon component by name
 * @param name - The name identifier for the icon
 * @returns The icon component or undefined if not found
 */
export const getIcon = (name: string): RemixiconComponentType | undefined => {
  return iconRegistry[name];
};

/**
 * Get all registered icon names
 * @returns Array of registered icon names
 */
export const getRegisteredIconNames = (): string[] => {
  return Object.keys(iconRegistry);
};

// Re-export RemixIcon components for direct import usage
// This allows tree-shaking when importing specific icons directly
export * from '@remixicon/react';

// Export the registry for advanced usage
export { iconRegistry };
