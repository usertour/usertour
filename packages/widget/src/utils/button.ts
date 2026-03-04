/**
 * Button utilities for widget rendering
 * Contains business logic for button variant resolution
 */

import type { ButtonSemanticType, ButtonContextType, ButtonVariant } from '@usertour/types';
import { BUTTON_VARIANT_MAP } from '@usertour/types';

/**
 * Normalize stored button type to semantic type
 * Handles backward compatibility for legacy 'default' values in database
 */
function toSemanticType(value: string | undefined): ButtonSemanticType {
  return value === 'secondary' ? 'secondary' : 'primary';
}

/**
 * Pure function: resolve button variant based on semantic type and context
 * No React dependencies - can be tested in isolation
 * Accepts stored values: 'primary' | 'secondary' (and legacy 'default' for backward compatibility)
 *
 * @param semanticType - Button semantic type (primary/secondary)
 * @param context - Rendering context (default/banner)
 * @returns Button variant to apply
 */
export function resolveButtonVariant(
  semanticType: ButtonSemanticType | string | undefined,
  context: ButtonContextType,
): ButtonVariant {
  const normalized = toSemanticType(typeof semanticType === 'string' ? semanticType : undefined);
  return BUTTON_VARIANT_MAP[context][normalized];
}

/**
 * Type guard to ensure we have a valid semantic type
 */
export function isValidButtonSemanticType(value: any): value is ButtonSemanticType {
  return value === 'primary' || value === 'secondary';
}
