import type { ButtonContextType, ButtonSemanticType, ButtonVariant } from '@usertour/types';

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
