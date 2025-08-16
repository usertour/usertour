import { AssetAttributes } from '@usertour-packages/frame';
import { ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { convertSettings, convertToCssVars } from '@usertour/helpers';
import { logger } from '@/utils';
import { getUserTourCss } from '@/core/usertour-env';
import { activedRulesConditions } from '@/core/usertour-helper';
import { isConditionsActived } from '@usertour/helpers';

const getAssets = (themeSettings: ThemeTypesSetting): AssetAttributes[] => {
  const { fontFamily } = themeSettings.font;

  const assets: AssetAttributes[] = [
    {
      tagName: 'link',
      isCheckLoaded: true,
      href: getUserTourCss(),
      rel: 'stylesheet',
      type: 'text/css',
    },
  ];
  if (fontFamily === 'System font' || fontFamily === 'Custom font') {
    return [...assets];
  }

  return [
    ...assets,
    {
      tagName: 'link',
      isCheckLoaded: false,
      href: `https://fonts.googleapis.com/css2?family=${fontFamily}`,
      rel: 'stylesheet',
      type: 'text/css',
    },
  ];
};

/**
 * Theme management utility functions
 * Handles theme-related operations for all Usertour components
 */
export const UsertourTheme = {
  /**
   * Gets theme settings with variation support
   */
  getThemeSettings: async (
    themeSettings: ThemeTypesSetting | undefined,
    themeVariations?: ThemeVariation[],
  ): Promise<ThemeTypesSetting | null> => {
    if (!themeSettings) {
      logger.error('Theme settings not found');
      return null;
    }

    if (!themeVariations) {
      return themeSettings;
    }

    // Process variations asynchronously to check conditions
    const activeVariations = [];
    for (const item of themeVariations) {
      const activatedConditions = await activedRulesConditions(item.conditions);
      if (isConditionsActived(activatedConditions)) {
        activeVariations.push(item);
      }
    }

    if (activeVariations.length === 0) {
      return themeSettings;
    }
    return activeVariations[0].settings;
  },

  /**
   * Converts theme settings to CSS assets
   */
  convertThemeToAssets: (themeSettings: ThemeTypesSetting): AssetAttributes[] => {
    return getAssets(themeSettings);
  },

  /**
   * Converts theme settings to CSS variables
   */
  convertToCssVars: (themeSettings: ThemeTypesSetting): string => {
    return convertToCssVars(convertSettings(themeSettings));
  },

  /**
   * Creates complete theme data for store
   */
  createThemeData: (themeSettings: ThemeTypesSetting) => {
    return {
      assets: UsertourTheme.convertThemeToAssets(themeSettings),
      globalStyle: UsertourTheme.convertToCssVars(themeSettings),
      themeSettings: themeSettings,
    };
  },
};
