import { ContentModalPlacementData } from './contents';

// ============================================================================
// Resource Center Theme Settings (migrated from resource-center.ts)
// ============================================================================

export type ResourceCenterPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ResourceCenterHeaderBackgroundType = 'none' | 'color' | 'gradient' | 'image';

export type ResourceCenterHeaderBackground = {
  type: ResourceCenterHeaderBackgroundType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  imageUrl: string;
};

export type ResourceCenterThemeSettings = {
  placement: ResourceCenterPlacement;
  offsetX: number;
  offsetY: number;
  normalWidth: number;
  largeWidth: number;
  maxHeight?: number;
  zIndex?: number;
  transitionDuration: number;
  dividerLines: boolean;
  headerBackground: ResourceCenterHeaderBackground;
  logoUrl: string;
};

export type ResourceCenterLauncherIconType =
  | 'default-question-mark'
  | 'plaintext-question-mark'
  | 'custom';

export type ResourceCenterLauncherTextMode = 'resource-center-text' | 'no-text';

export type ResourceCenterLauncherButtonThemeSettings = {
  iconType: ResourceCenterLauncherIconType;
  iconUrl?: string;
  height: number;
  imageHeight: number;
  borderRadius: number | null;
  textMode: ResourceCenterLauncherTextMode;
  color: {
    background: string;
    hover: string;
    active: string;
    foreground: string;
  };
};

export type ResourceCenterUnreadBadgeThemeSettings = {
  backgroundColor: string;
  textColor: string;
};

/**
 * Announcement popup surfaces (speech bubble / modal) — widths are theme
 * policy, not per-announcement content settings.
 */
export type AnnouncementThemeSettings = {
  bubbleWidth: number;
  modalWidth: number;
};

export enum ProgressBarType {
  FULL_WIDTH = 'full-width',
  NARROW = 'narrow',
  CHAIN_ROUNDED = 'chain-rounded',
  CHAIN_SQUARED = 'chain-squared',
  DOTS = 'dots',
  NUMBERED = 'numbered',
}

export enum ProgressBarPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
}

export enum AvatarType {
  CARTOON = 'cartoon',
  UPLOAD = 'upload',
  URL = 'url',
  NONE = 'none',
}

export enum MissingTooltipTargetBehavior {
  AUTO_DISMISS = 'auto-dismiss',
  USE_BUBBLE = 'use-bubble',
}

export enum ModalBackdropClickBehavior {
  DO_NOTHING = 'do-nothing',
  DISMISS_FLOW = 'dismiss-flow',
}

export type BannerAnimationTiming = 'smooth' | 'snappy' | 'gentle' | 'linear';

export type ThemeTypesSettingsColor = {
  background: string;
  color: string;
  hover: string;
  active: string;
  autoHover?: string;
  autoActive?: string;
};
export type ThemeTypesSettingsButton = {
  fontWeight: number;
  textColor: ThemeTypesSettingsColor;
  backgroundColor: ThemeTypesSettingsColor;
  border: {
    enabled: boolean;
    borderWidth: number;
    color: ThemeTypesSettingsColor;
  };
};
export type ThemeTypesSetting = {
  brandColor: ThemeTypesSettingsColor;
  mainColor: ThemeTypesSettingsColor;
  font: {
    fontFamily: string;
    // Actual font-family used when fontFamily is 'Custom font'. The font
    // itself must be declared via @font-face rules in customCss.
    customFontFamily?: string;
    fontSize: number;
    lineHeight: number;
    fontWeightNormal: number;
    fontWeightBold: number;
    h1FontSize: number;
    h2FontSize: number;
    linkColor: string;
  };
  border: {
    borderRadius: number;
    borderWidthEnabled: boolean;
    borderWidth: number;
    borderColor: string;
  };
  xbutton: {
    color: string;
  };
  progress: {
    enabled: boolean;
    color: string;
    height: number;
    type: ProgressBarType;
    position: ProgressBarPosition;
    narrowHeight: number;
    chainSquaredHeight: number;
    chainRoundedHeight: number;
    dotsHeight: number;
    numberedHeight: number;
  };
  survey: {
    color: string;
  };
  launcherBeacon: {
    color: string;
    size: number;
  };
  launcherIcon: {
    color: ThemeTypesSettingsColor;
    opacity: number;
    size: number;
  };
  launcherButtons: {
    height: number;
    width?: number;
    px: number;
    borderRadius: number;
    primary: ThemeTypesSettingsButton;
  };
  checklist: {
    checkmarkColor: string;
    width: number;
    placement: ContentModalPlacementData;
    zIndex?: number;
    completedTaskTextDecoration?: string;
  };
  banner: {
    backgroundColor: ThemeTypesSettingsColor;
    textColor: ThemeTypesSettingsColor;
    padding: number;
    animationDuration: number;
    animationTiming: BannerAnimationTiming;
  };
  checklistLauncher: {
    borderRadius: number;
    height: number;
    fontWeight: number;
    placement: ContentModalPlacementData;
    color: ThemeTypesSettingsColor;
    counter: {
      color: string;
      background: string;
    };
  };
  buttons: {
    height: number;
    minWidth: number;
    px: number;
    borderRadius: number;
    primary: ThemeTypesSettingsButton;
    secondary: ThemeTypesSettingsButton;
  };
  tooltip: {
    width: number;
    notchSize: number;
    missingTargetTolerance: number;
    missingTargetBehavior: MissingTooltipTargetBehavior;
  };
  modal: {
    width: number;
    padding: number;
    backdropClickBehavior: ModalBackdropClickBehavior;
  };
  bubble: {
    placement: ContentModalPlacementData;
    width: number;
  };
  backdrop: {
    color: string;
    opacity: number;
    highlight: {
      type: string;
      radius: number;
      spread: number;
      color: string;
      opacity: number;
    };
  };
  focusHighlight: {
    color: string;
    opacity: number;
  };
  avatar: {
    type: AvatarType;
    size: number;
    url?: string;
    name?: string;
  };
  resourceCenter?: ResourceCenterThemeSettings;
  resourceCenterLauncherButton?: ResourceCenterLauncherButtonThemeSettings;
  resourceCenterUnreadBadge?: ResourceCenterUnreadBadgeThemeSettings;
  announcement?: AnnouncementThemeSettings;
  // Raw CSS injected as a <style> tag into every widget iframe. The
  // sanctioned home for @font-face rules backing 'Custom font' and for
  // advanced widget style overrides.
  customCss?: string;
};
