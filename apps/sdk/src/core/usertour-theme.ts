import { AssetAttributes } from '@usertour-packages/frame';
import { ThemeTypesSetting, SessionTheme } from '@usertour/types';
import { convertSettings, convertToCssVars, isConditionsActived } from '@usertour/helpers';
import { getUserTourCss } from '@/core/usertour-env';
import { rulesEvaluatorManager } from '@/core/usertour-rules-evaluator';
import { logger } from '@/utils/logger';

// === Private Helpers ===
/**
 * Gets CSS assets based on theme settings
 */
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
   * @param contentId - The content ID for rules evaluation
   * @param sessionTheme - The session theme data
   */
  getThemeSettings: async (
    contentId: string,
    sessionTheme: SessionTheme | undefined,
  ): Promise<ThemeTypesSetting | null> => {
    if (!sessionTheme) {
      return null;
    }
    const { settings, variations, attributes } = sessionTheme;
    if (!variations || variations.length === 0) {
      return settings;
    }

    // Process variations asynchronously to check conditions
    const evaluator = rulesEvaluatorManager.getEvaluator(contentId);
    for (const item of variations) {
      try {
        const activatedConditions = await evaluator.evaluate(item.conditions, attributes);
        if (isConditionsActived(activatedConditions)) {
          return item.settings;
        }
      } catch (error) {
        logger.error('Error evaluating theme variation conditions:', error);
        // Continue to check other variations
      }
    }
    return settings;
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
  convertToCssVars: (themeSettings: ThemeTypesSetting, type = 'tooltip'): string => {
    return convertToCssVars(convertSettings(themeSettings), type);
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
