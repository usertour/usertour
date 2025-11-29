import { ThemeTypesSetting, defaultSettings } from '@usertour/types';
import { hexToHSLString, hexToRGBStr } from './color';
import { deepmerge } from 'deepmerge-ts';
import { isUndefined } from './type-utils';

const defaultFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

export const mergeThemeDefaultSettings = (settings: ThemeTypesSetting) => {
  return deepmerge(defaultSettings, settings) as ThemeTypesSetting;
};

export const convertSettings = (settings: ThemeTypesSetting) => {
  const data = mergeThemeDefaultSettings(settings);
  if (settings.mainColor.hover === 'Auto') {
    data.mainColor.hover = settings.mainColor.autoHover as string;
  }
  if (settings.mainColor.active === 'Auto') {
    data.mainColor.active = settings.mainColor.autoActive as string;
  }
  if (settings.brandColor.hover === 'Auto') {
    data.brandColor.hover = settings.brandColor.autoHover as string;
  }
  if (settings.brandColor.active === 'Auto') {
    data.brandColor.active = settings.brandColor.autoActive as string;
  }
  if (settings.border.borderColor === 'Auto') {
    data.border.borderColor = settings.mainColor.color;
  }
  if (settings.buttons.primary.textColor.color === 'Auto') {
    data.buttons.primary.textColor.color = settings.brandColor.color;
  }
  if (settings.buttons.primary.textColor.hover === 'Auto') {
    data.buttons.primary.textColor.hover = settings.brandColor.color;
  }
  if (settings.buttons.primary.textColor.active === 'Auto') {
    data.buttons.primary.textColor.active = settings.brandColor.color;
  }
  if (settings.buttons.primary.backgroundColor.background === 'Auto') {
    data.buttons.primary.backgroundColor.background = settings.brandColor.background;
  }
  if (settings.buttons.primary.backgroundColor.hover === 'Auto') {
    data.buttons.primary.backgroundColor.hover = settings.brandColor.autoHover as string;
  }
  if (settings.buttons.primary.backgroundColor.active === 'Auto') {
    data.buttons.primary.backgroundColor.active = settings.brandColor.autoActive as string;
  }
  if (settings.buttons.primary.border.color.color === 'Auto') {
    data.buttons.primary.border.color.color = settings.brandColor.background;
  }
  if (settings.buttons.primary.border.color.hover === 'Auto') {
    data.buttons.primary.border.color.hover = settings.brandColor.autoHover as string;
  }
  if (settings.buttons.primary.border.color.active === 'Auto') {
    data.buttons.primary.border.color.active = settings.brandColor.autoActive as string;
  }

  if (settings.buttons.secondary.textColor.color === 'Auto') {
    data.buttons.secondary.textColor.color = settings.brandColor.background;
  }
  if (settings.buttons.secondary.textColor.hover === 'Auto') {
    data.buttons.secondary.textColor.hover = settings.brandColor.background;
  }
  if (settings.buttons.secondary.textColor.active === 'Auto') {
    data.buttons.secondary.textColor.active = settings.brandColor.background;
  }
  if (settings.buttons.secondary.backgroundColor.background === 'Auto') {
    data.buttons.secondary.backgroundColor.background = settings.mainColor.background;
  }
  if (settings.buttons.secondary.backgroundColor.hover === 'Auto') {
    data.buttons.secondary.backgroundColor.hover = settings.mainColor.autoHover as string;
  }
  if (settings.buttons.secondary.backgroundColor.active === 'Auto') {
    data.buttons.secondary.backgroundColor.active = settings.mainColor.autoActive as string;
  }
  if (settings.buttons.secondary.border.color.color === 'Auto') {
    data.buttons.secondary.border.color.color = settings.brandColor.background;
  }
  if (settings.buttons.secondary.border.color.hover === 'Auto') {
    data.buttons.secondary.border.color.hover = settings.brandColor.background;
  }
  if (settings.buttons.secondary.border.color.active === 'Auto') {
    data.buttons.secondary.border.color.active = settings.brandColor.background;
  }
  if (settings.font.linkColor === 'Auto') {
    data.font.linkColor = settings.brandColor.background;
  }
  if (settings.xbutton.color === 'Auto') {
    data.xbutton.color = settings.brandColor.background;
  }

  if (settings?.progress?.color === 'Auto') {
    data.progress.color = settings.brandColor.background;
  }

  if (settings?.launcherBeacon?.color === 'Auto') {
    data.launcherBeacon.color = settings.brandColor.background;
  }

  if (settings?.launcherIcon?.color?.color === 'Auto') {
    data.launcherIcon.color.color = settings.brandColor.background;
  }
  if (settings?.launcherIcon?.color?.hover === 'Auto') {
    data.launcherIcon.color.hover = settings.brandColor.autoHover as string;
  }
  if (settings?.launcherIcon?.color?.active === 'Auto') {
    data.launcherIcon.color.active = settings.brandColor.autoActive as string;
  }

  if (settings.checklistLauncher?.color?.color === 'Auto') {
    data.checklistLauncher.color.color = settings.brandColor.color;
  }
  if (settings.checklistLauncher?.color?.background === 'Auto') {
    data.checklistLauncher.color.background = settings.brandColor.background;
  }
  if (settings.checklistLauncher?.color?.hover === 'Auto') {
    data.checklistLauncher.color.hover = settings.brandColor.autoHover as string;
  }
  if (settings.checklistLauncher?.color?.active === 'Auto') {
    data.checklistLauncher.color.active = settings.brandColor.autoActive as string;
  }
  if (settings.checklistLauncher?.counter?.color === 'Auto') {
    data.checklistLauncher.counter.color = settings.brandColor.background;
  }
  if (settings.checklistLauncher?.counter?.background === 'Auto') {
    data.checklistLauncher.counter.background = settings.brandColor.color;
  }
  if (settings.survey?.color === 'Auto') {
    data.survey.color = settings.brandColor.background;
  }

  if (settings.font.fontFamily === 'System font') {
    data.font.fontFamily = defaultFontFamily;
  } else {
    data.font.fontFamily += ', sans-serif;';
  }

  return data;
  //
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
    '--usertour-checklist-trigger-font-color': settings.checklistLauncher.color.color,
    '--usertour-checklist-trigger-font-weight': settings.checklistLauncher.fontWeight,
    '--usertour-checkmark-background-color': settings.checklist.checkmarkColor,
    '--usertour-checklist-trigger-height': `${settings.checklistLauncher.height}px`,
    '--usertour-checklist-trigger-hover-background-color': settings.checklistLauncher.color.hover,
    '--usertour-question-color': hexToHSLString(settings.survey.color),
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
