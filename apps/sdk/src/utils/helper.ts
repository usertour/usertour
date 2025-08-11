import { ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { activedRulesConditions } from './conditions';
import { isActive, isEqual } from '@usertour/helpers';

export const getActivedThemeSettings = async (
  themeSettings: ThemeTypesSetting,
  themeVariations: ThemeVariation[],
): Promise<ThemeTypesSetting> => {
  if (!themeVariations) {
    return themeSettings;
  }

  // Process variations asynchronously to check conditions
  const activeVariations = [];
  for (const item of themeVariations) {
    const activatedConditions = await activedRulesConditions(item.conditions);
    if (isActive(activatedConditions)) {
      activeVariations.push(item);
    }
  }

  if (activeVariations.length === 0) {
    return themeSettings;
  }
  return activeVariations[0].settings;
};

/**
 * Checks if attributes have actually changed by comparing current and new attributes
 * @param currentAttributes - Current attributes object
 * @param newAttributes - New attributes to merge
 * @returns True if attributes have changed, false otherwise
 */
export const hasAttributesChanged = (
  currentAttributes: Record<string, any> = {},
  newAttributes: Record<string, any> = {},
): boolean => {
  const mergedAttributes = { ...currentAttributes, ...newAttributes };
  return !isEqual(currentAttributes, mergedAttributes);
};
