import { ThemeTypesSetting, defaultSettings } from '@usertour/types';
import { hexToHSLString, hexToRGBStr } from './color';
import { deepmergeCustom } from 'deepmerge-ts';
import { isUndefined } from './type-utils';
import { deepClone } from './utils';

const defaultFontFamily =
  '-apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

/**
 * Custom merge function that treats null/undefined as "use default value".
 * This ensures that missing or explicitly null values in settings
 * will fallback to defaultSettings values.
 */
const mergeWithDefaults = deepmergeCustom({
  mergeOthers: (values) => {
    // values[0] is from defaultSettings, values[1] is from settings
    const settingsValue = values[values.length - 1];
    // If settings value is null or undefined, use the default
    if (settingsValue === null || settingsValue === undefined) {
      return values[0];
    }
    return settingsValue;
  },
});

/**
 * Resolves 'Auto' values to their fallback values.
 * If the value is 'Auto', undefined, or null, returns the fallback value.
 * Otherwise, returns the original value.
 *
 * @param value - The source value that might be 'Auto' or undefined
 * @param fallback - The fallback value to use when value is 'Auto'
 * @returns The resolved value
 */
const resolveAutoValue = <T>(value: T | 'Auto' | undefined | null, fallback: T): T => {
  if (value === 'Auto' || value === undefined || value === null) {
    return fallback;
  }
  return value as T;
};

export const mergeThemeDefaultSettings = (settings: ThemeTypesSetting) => {
  // Use deepClone to ensure defaultSettings is not mutated
  const base = deepClone(defaultSettings);
  return mergeWithDefaults(base, settings) as ThemeTypesSetting;
};

export const convertSettings = (settings: ThemeTypesSetting) => {
  const data = mergeThemeDefaultSettings(settings);

  // Main color auto values - use data for fallbacks to ensure defaultSettings values are available
  data.mainColor.hover = resolveAutoValue(data.mainColor.hover, data.mainColor.autoHover as string);
  data.mainColor.active = resolveAutoValue(
    data.mainColor.active,
    data.mainColor.autoActive as string,
  );

  // Brand color auto values
  data.brandColor.hover = resolveAutoValue(
    data.brandColor.hover,
    data.brandColor.autoHover as string,
  );
  data.brandColor.active = resolveAutoValue(
    data.brandColor.active,
    data.brandColor.autoActive as string,
  );

  // Border auto values
  data.border.borderColor = resolveAutoValue(data.border.borderColor, data.mainColor.color);

  // Primary button text color auto values
  data.buttons.primary.textColor.color = resolveAutoValue(
    data.buttons.primary.textColor.color,
    data.brandColor.color,
  );
  data.buttons.primary.textColor.hover = resolveAutoValue(
    data.buttons.primary.textColor.hover,
    data.brandColor.color,
  );
  data.buttons.primary.textColor.active = resolveAutoValue(
    data.buttons.primary.textColor.active,
    data.brandColor.color,
  );

  // Primary button background color auto values
  data.buttons.primary.backgroundColor.background = resolveAutoValue(
    data.buttons.primary.backgroundColor.background,
    data.brandColor.background,
  );
  data.buttons.primary.backgroundColor.hover = resolveAutoValue(
    data.buttons.primary.backgroundColor.hover,
    data.brandColor.autoHover as string,
  );
  data.buttons.primary.backgroundColor.active = resolveAutoValue(
    data.buttons.primary.backgroundColor.active,
    data.brandColor.autoActive as string,
  );

  // Primary button border color auto values
  data.buttons.primary.border.color.color = resolveAutoValue(
    data.buttons.primary.border.color.color,
    data.brandColor.background,
  );
  data.buttons.primary.border.color.hover = resolveAutoValue(
    data.buttons.primary.border.color.hover,
    data.brandColor.autoHover as string,
  );
  data.buttons.primary.border.color.active = resolveAutoValue(
    data.buttons.primary.border.color.active,
    data.brandColor.autoActive as string,
  );

  // Secondary button text color auto values
  data.buttons.secondary.textColor.color = resolveAutoValue(
    data.buttons.secondary.textColor.color,
    data.brandColor.background,
  );
  data.buttons.secondary.textColor.hover = resolveAutoValue(
    data.buttons.secondary.textColor.hover,
    data.brandColor.background,
  );
  data.buttons.secondary.textColor.active = resolveAutoValue(
    data.buttons.secondary.textColor.active,
    data.brandColor.background,
  );

  // Secondary button background color auto values
  data.buttons.secondary.backgroundColor.background = resolveAutoValue(
    data.buttons.secondary.backgroundColor.background,
    data.mainColor.background,
  );
  data.buttons.secondary.backgroundColor.hover = resolveAutoValue(
    data.buttons.secondary.backgroundColor.hover,
    data.mainColor.autoHover as string,
  );
  data.buttons.secondary.backgroundColor.active = resolveAutoValue(
    data.buttons.secondary.backgroundColor.active,
    data.mainColor.autoActive as string,
  );

  // Secondary button border color auto values
  data.buttons.secondary.border.color.color = resolveAutoValue(
    data.buttons.secondary.border.color.color,
    data.brandColor.background,
  );
  data.buttons.secondary.border.color.hover = resolveAutoValue(
    data.buttons.secondary.border.color.hover,
    data.brandColor.background,
  );
  data.buttons.secondary.border.color.active = resolveAutoValue(
    data.buttons.secondary.border.color.active,
    data.brandColor.background,
  );

  // Font auto values
  data.font.linkColor = resolveAutoValue(data.font.linkColor, data.brandColor.background);

  // X button auto values
  data.xbutton.color = resolveAutoValue(data.xbutton.color, data.mainColor.color);

  // Progress bar auto values
  data.progress.color = resolveAutoValue(data.progress.color, data.brandColor.background);

  // Launcher beacon auto values
  data.launcherBeacon.color = resolveAutoValue(
    data.launcherBeacon.color,
    data.brandColor.background,
  );

  // Launcher icon auto values
  data.launcherIcon.color.color = resolveAutoValue(
    data.launcherIcon.color.color,
    data.brandColor.background,
  );
  data.launcherIcon.color.hover = resolveAutoValue(
    data.launcherIcon.color.hover,
    data.brandColor.autoHover as string,
  );
  data.launcherIcon.color.active = resolveAutoValue(
    data.launcherIcon.color.active,
    data.brandColor.autoActive as string,
  );

  // Checklist launcher color auto values
  data.checklistLauncher.color.color = resolveAutoValue(
    data.checklistLauncher.color.color,
    data.brandColor.color,
  );
  data.checklistLauncher.color.background = resolveAutoValue(
    data.checklistLauncher.color.background,
    data.brandColor.background,
  );
  data.checklistLauncher.color.hover = resolveAutoValue(
    data.checklistLauncher.color.hover,
    data.brandColor.autoHover as string,
  );
  data.checklistLauncher.color.active = resolveAutoValue(
    data.checklistLauncher.color.active,
    data.brandColor.autoActive as string,
  );

  // Checklist launcher counter auto values
  data.checklistLauncher.counter.color = resolveAutoValue(
    data.checklistLauncher.counter.color,
    data.brandColor.background,
  );
  data.checklistLauncher.counter.background = resolveAutoValue(
    data.checklistLauncher.counter.background,
    data.brandColor.color,
  );

  // Survey auto values
  data.survey.color = resolveAutoValue(data.survey.color, data.brandColor.background);

  // Launcher button primary text color auto values
  data.launcherButtons.primary.textColor.color = resolveAutoValue(
    data.launcherButtons.primary.textColor.color,
    data.brandColor.color,
  );
  data.launcherButtons.primary.textColor.hover = resolveAutoValue(
    data.launcherButtons.primary.textColor.hover,
    data.brandColor.color,
  );
  data.launcherButtons.primary.textColor.active = resolveAutoValue(
    data.launcherButtons.primary.textColor.active,
    data.brandColor.color,
  );

  // Launcher button primary background color auto values
  data.launcherButtons.primary.backgroundColor.background = resolveAutoValue(
    data.launcherButtons.primary.backgroundColor.background,
    data.brandColor.background,
  );
  data.launcherButtons.primary.backgroundColor.hover = resolveAutoValue(
    data.launcherButtons.primary.backgroundColor.hover,
    data.brandColor.autoHover as string,
  );
  data.launcherButtons.primary.backgroundColor.active = resolveAutoValue(
    data.launcherButtons.primary.backgroundColor.active,
    data.brandColor.autoActive as string,
  );

  // Launcher button primary border color auto values
  data.launcherButtons.primary.border.color.color = resolveAutoValue(
    data.launcherButtons.primary.border.color.color,
    data.brandColor.background,
  );
  data.launcherButtons.primary.border.color.hover = resolveAutoValue(
    data.launcherButtons.primary.border.color.hover,
    data.brandColor.autoHover as string,
  );
  data.launcherButtons.primary.border.color.active = resolveAutoValue(
    data.launcherButtons.primary.border.color.active,
    data.brandColor.autoActive as string,
  );

  // Font family handling
  if (data.font.fontFamily === 'System font') {
    data.font.fontFamily = defaultFontFamily;
  } else if (!data.font.fontFamily.includes('sans-serif')) {
    data.font.fontFamily += ', sans-serif;';
  }

  return data;
};

export const convertToCssVars = (settings: ThemeTypesSetting, type = 'tooltip') => {
  const cssMapping: any = {
    '--usertour-background': hexToHSLString(settings.mainColor.background),
    '--usertour-foreground': hexToHSLString(settings.mainColor.color),
    '--usertour-brand-active-background-color': hexToHSLString(
      settings.brandColor.autoActive as string,
    ),
    '--usertour-brand-hover-background-color': hexToHSLString(
      settings.brandColor.autoHover as string,
    ),
    '--usertour-font-family': settings.font.fontFamily,
    '--usertour-font-size': `${settings.font.fontSize}px`,
    '--usertour-main-background-color': settings.mainColor.background,
    '--usertour-main-foreground-color': settings.mainColor.color,
    '--usertour-main-hover-background-color': hexToHSLString(
      settings.mainColor.autoHover as string,
    ),
    '--usertour-main-active-background-color': hexToHSLString(
      settings.mainColor.autoActive as string,
    ),
    '--usertour-line-height': `${settings.font.lineHeight}px`,
    '--usertour-widget-popper-border-radius': `${settings.border.borderRadius}px`,
    '--usertour-font-weight-normal': settings.font.fontWeightNormal,
    '--usertour-font-weight-bold': settings.font.fontWeightBold,
    '--usertour-h1-font-size': `${settings.font.h1FontSize}px`,
    '--usertour-h2-font-size': `${settings.font.h2FontSize}px`,
    '--usertour-link-color': hexToHSLString(settings.font.linkColor),
    '--usertour-widget-popper-border-width': settings.border.borderWidthEnabled
      ? `${settings.border.borderWidth}px`
      : '0px',
    '--usertour-widget-popper-border-color': settings.border.borderColor,
    '--usertour-button-border-radius': `${settings.buttons.borderRadius}px`,
    '--usertour-button-height': `${settings.buttons.height}px`,
    '--usertour-button-min-width': `${settings.buttons.minWidth}px`,
    '--usertour-button-px': `${settings.buttons.px}px`,
    '--usertour-primary': settings.buttons.primary.backgroundColor.background,
    '--usertour-primary-hover': settings.buttons.primary.backgroundColor.hover,
    '--usertour-primary-active': settings.buttons.primary.backgroundColor.active,
    '--usertour-primary-foreground': settings.buttons.primary.textColor.color,
    '--usertour-primary-foreground-hover': settings.buttons.primary.textColor.hover,
    '--usertour-primary-foreground-active': settings.buttons.primary.textColor.active,
    '--usertour-primary-border-width': settings.buttons.primary.border.enabled
      ? `${settings.buttons.primary.border.borderWidth}px`
      : '0px',
    '--usertour-primary-border-color': settings.buttons.primary.border.color.color,
    '--usertour-primary-border-hover': settings.buttons.primary.border.color.hover,
    '--usertour-primary-border-active': settings.buttons.primary.border.color.active,
    '--usertour-primary-font-weight': settings.buttons.primary.fontWeight,
    '--usertour-secondary': settings.buttons.secondary.backgroundColor.background,
    '--usertour-secondary-hover': settings.buttons.secondary.backgroundColor.hover,
    '--usertour-secondary-active': settings.buttons.secondary.backgroundColor.active,
    '--usertour-secondary-foreground': settings.buttons.secondary.textColor.color,
    '--usertour-secondary-foreground-hover': settings.buttons.secondary.textColor.hover,
    '--usertour-secondary-foreground-active': settings.buttons.secondary.textColor.active,
    '--usertour-secondary-border-width': settings.buttons.secondary.border.enabled
      ? `${settings.buttons.secondary.border.borderWidth}px`
      : '0px',
    '--usertour-secondary-border-color': settings.buttons.secondary.border.color.color,
    '--usertour-secondary-border-hover': settings.buttons.secondary.border.color.hover,
    '--usertour-secondary-border-active': settings.buttons.secondary.border.color.active,
    '--usertour-secondary-font-weight': settings.buttons.secondary.fontWeight,
    '--usertour-backdrop-color-rgb': hexToRGBStr(settings.backdrop.color),
    '--usertour-backdrop-highlight-color-rgb': hexToRGBStr(settings.backdrop.highlight.color),
    '--usertour-backdrop-highlight-opacity': settings.backdrop.highlight.opacity / 100,
    '--usertour-backdrop-highlight-radius': `${settings.backdrop.highlight.radius}px`,
    '--usertour-backdrop-highlight-spread': `${settings.backdrop.highlight.spread}px`,
    '--usertour-backdrop-opacity': settings.backdrop.opacity / 100,
    '--usertour-progress-bar-color': settings.progress.color,
    '--usertour-progress-bar-height': `${settings.progress.height}px`,
    '--usertour-narrow-progress-bar-height': `${settings.progress.narrowHeight}px`,
    '--usertour-squared-progress-bar-height': `${settings.progress.chainSquaredHeight}px`,
    '--usertour-rounded-progress-bar-height': `${settings.progress.chainRoundedHeight}px`,
    '--usertour-dotted-progress-bar-height': `${settings.progress.dotsHeight}px`,
    '--usertour-numbered-progress-bar-height': `${settings.progress.numberedHeight}px`,
    '--usertour-widget-popper-padding':
      type === 'modal' ? `${settings.modal.padding}px` : undefined,
    '--usertour-xbutton': settings.xbutton.color,

    '--usertour-widget-launcher-icon-color': settings.launcherIcon.color.color,
    '--usertour-widget-launcher-icon-hover-color': settings.launcherIcon.color.hover,
    '--usertour-widget-launcher-icon-active-color': settings.launcherIcon.color.active,
    '--usertour-widget-launcher-icon-size': `${settings.launcherIcon.size}px`,
    '--usertour-widget-beacon-color': settings.launcherBeacon.color,
    '--usertour-widget-beacon-size': `${settings.launcherBeacon.size}px`,
    '--usertour-widget-launcher-icon-opacity': settings.launcherIcon.opacity / 100,
    '--usertour-widget-popper-padding-top': '2px',
    '--usertour-widget-popper-padding-bottom': '2px',
    '--usertour-checklist-trigger-active-background-color': settings.checklistLauncher.color.active,
    '--usertour-checklist-trigger-background-color': settings.checklistLauncher.color.background,
    '--usertour-checklist-trigger-border-radius': `${settings.checklistLauncher.borderRadius}px`,
    '--usertour-checklist-trigger-counter-background-color':
      settings.checklistLauncher.counter.background,
    '--usertour-checklist-trigger-counter-font-color': settings.checklistLauncher.counter.color,
    '--usertour-checklist-trigger-font-color-rgb': settings.checklistLauncher.color.color,
    '--usertour-checklist-trigger-font-color': hexToHSLString(
      settings.checklistLauncher.color.color,
    ),
    '--usertour-checklist-trigger-font-weight': settings.checklistLauncher.fontWeight,
    '--usertour-checkmark-background-color': settings.checklist.checkmarkColor,
    '--usertour-checklist-trigger-height': `${settings.checklistLauncher.height}px`,
    '--usertour-checklist-trigger-hover-background-color': settings.checklistLauncher.color.hover,
    '--usertour-question-color': hexToHSLString(settings.survey.color),
    '--usertour-launcher-button-height': `${settings.launcherButtons.height}px`,
    '--usertour-launcher-button-width': !settings.launcherButtons.width
      ? 'auto'
      : `${settings.launcherButtons.width}px`,
    '--usertour-launcher-button-horizontal-padding': `${settings.launcherButtons.px}px`,
    '--usertour-launcher-button-border-radius': `${settings.launcherButtons.borderRadius}px`,
    '--usertour-launcher-button-background-color':
      settings.launcherButtons.primary.backgroundColor.background,
    '--usertour-launcher-button-hover-background-color':
      settings.launcherButtons.primary.backgroundColor.hover,
    '--usertour-launcher-button-active-background-color':
      settings.launcherButtons.primary.backgroundColor.active,
    '--usertour-launcher-button-font-color': settings.launcherButtons.primary.textColor.color,
    '--usertour-launcher-button-hover-font-color': settings.launcherButtons.primary.textColor.hover,
    '--usertour-launcher-button-active-font-color':
      settings.launcherButtons.primary.textColor.active,
    '--usertour-launcher-button-font-weight': settings.launcherButtons.primary.fontWeight,
    '--usertour-launcher-button-border-width': settings.launcherButtons.primary.border.enabled
      ? `${settings.launcherButtons.primary.border.borderWidth}px`
      : '0px',
    '--usertour-launcher-button-border-color': settings.launcherButtons.primary.border.color.color,
    '--usertour-launcher-button-hover-border-color':
      settings.launcherButtons.primary.border.color.hover,
    '--usertour-launcher-button-active-border-color':
      settings.launcherButtons.primary.border.color.active,
  };

  if (settings.backdrop.highlight.type === 'inside') {
    cssMapping['--usertour-backdrop-highlight-inset'] = 'inset';
  }

  let css = '';
  for (const key in cssMapping) {
    const value = cssMapping[key];
    if (!isUndefined(value)) {
      css += `${key}:${value};`;
    }
  }

  return css;
};
/*
let css = `--usertour-background: ${
  settings.mainColor.background
}; --usertour-foreground: ${
  settings.mainColor.color
}; --usertour-muted: #f4f4f5; --usertour-muted-foreground: #71717a; --usertour-popover: #ffffff; --usertour-popover-foreground: #09090b; --usertour-card: #ffffff; --usertour-card-foreground: #09090b; --usertour-border: #e4e4e7; --usertour-input: #e4e4e7; --usertour-primary: ${
  settings.buttons.primary.backgroundColor.background
};--usertour-primary-hover:${
  settings.buttons.primary.backgroundColor.hover
};--usertour-primary-active:${
  settings.buttons.primary.backgroundColor.active
}; --usertour-primary-foreground: ${
  settings.buttons.primary.textColor.color
}; --usertour-secondary: ${
  settings.buttons.secondary.backgroundColor.background
}; --usertour-secondary-foreground: ${
  settings.buttons.secondary.textColor.color
}; --usertour-accent: #f4f4f5; --usertour-accent-foreground: #18181b; --usertour-destructive: #ef4444; --usertour-destructive-foreground: #fafafa; --usertour-ring: #a1a1aa; --usertour-radius: 0.5rem; --usertour-popper-radius: 0.5rem; --usertour-backdrop-color-rgb: 0, 0, 0; --usertour-backdrop-highlight-color-rgb: 255, 255, 255; --usertour-backdrop-highlight-opacity: 0.5; --usertour-backdrop-highlight-radius: 4px; --usertour-backdrop-highlight-spread: 0px; --usertour-backdrop-opacity: 0.4; --usertour-tooltip-notch-size: 20px; --usertour-notch-color: white; --usertour-widget-popper-border-radius: ${
  settings.border.borderRadius
}px; --usertour-widget-popper-border-width: ${
  settings.border.borderWidthEnabled ? settings.border.borderWidth : 0
}px; --usertour-widget-popper-border-color: ${settings.border.borderColor};`;
*/
