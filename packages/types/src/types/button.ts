/**
 * Button type system for UserTour widget
 * Separates semantic button types (what the editor sends) from rendering variants (how it looks)
 */

/**
 * Semantic button type - what the editor sends
 * These map to user intent (primary action vs secondary action)
 */
export type ButtonSemanticType = 'primary' | 'secondary';

/**
 * Rendering context determines which visual variant to apply
 * - 'default': Normal widget context (modal, toast, etc.)
 * - 'banner': Inside a Banner component
 */
export type ButtonContextType = 'default' | 'banner';

/**
 * Button variant - the actual CSS class variant to apply
 * This is what the Button component receives
 */
export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'banner-primary'
  | 'banner-secondary'
  | 'custom';

/**
 * Mapping from (context, semanticType) → variant
 * If you add new contexts (e.g., modal, sidebar), just extend this map
 */
export const BUTTON_VARIANT_MAP: Record<
  ButtonContextType,
  Record<ButtonSemanticType, ButtonVariant>
> = {
  default: {
    primary: 'default',
    secondary: 'secondary',
  },
  banner: {
    primary: 'banner-primary',
    secondary: 'banner-secondary',
  },
};

/**
 * Get default semantic type if none provided
 */
export const DEFAULT_BUTTON_SEMANTIC_TYPE: ButtonSemanticType = 'primary';
