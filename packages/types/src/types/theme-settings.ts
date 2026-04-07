import { ContentModalPlacementData, ModalPosition } from './contents';

// ============================================================================
// Resource Center Theme Settings (migrated from resource-center.ts)
// ============================================================================

export type ResourceCenterPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ResourceCenterHeaderBackgroundType = 'color' | 'gradient' | 'image';

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
};

export type ResourceCenterLauncherIconType =
  | 'default-question-mark'
  | 'plaintext-question-mark'
  | 'custom';

export type ResourceCenterLauncherTextMode =
  | 'active-checklist-text'
  | 'resource-center-text'
  | 'no-text';

export type ResourceCenterLauncherButtonThemeSettings = {
  iconType: ResourceCenterLauncherIconType;
  iconUrl?: string;
  height: number;
  imageHeight: number;
  borderRadius: number | null;
  textMode: ResourceCenterLauncherTextMode;
  showRemainingTasks: boolean;
};

export type ResourceCenterUnreadBadgeThemeSettings = {
  backgroundColor: string;
  textColor: string;
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
    fontSize: number;
    lineHeight: number;
    fontWeightNormal: number;
    fontWeightBold: number;
    h1FontSize: number;
    h2FontSize: number;
    linkColor: string;
  };
  border: {
    borderRadius: string;
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
};

export const defaultSettings: ThemeTypesSetting = {
  font: {
    fontSize: 16,
    linkColor: 'Auto',
    fontFamily: 'System font',
    h1FontSize: 24,
    h2FontSize: 20,
    lineHeight: 24,
    fontWeightBold: 600,
    fontWeightNormal: 400,
  },
  modal: {
    width: 600,
    padding: 40,
    backdropClickBehavior: ModalBackdropClickBehavior.DO_NOTHING,
  },
  border: {
    borderColor: 'Auto',
    borderWidth: 1,
    borderRadius: '10',
    borderWidthEnabled: false,
  },
  survey: {
    color: 'Auto',
  },
  buttons: {
    px: 16,
    height: 32,
    primary: {
      border: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        enabled: false,
        borderWidth: 1,
      },
      textColor: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#FFFFFF',
      },
      fontWeight: 600,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    minWidth: 0,
    secondary: {
      border: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        enabled: true,
        borderWidth: 1,
      },
      textColor: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#FFFFFF',
      },
      fontWeight: 600,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    borderRadius: 8,
  },
  tooltip: {
    width: 300,
    notchSize: 20,
    missingTargetTolerance: 3,
    missingTargetBehavior: MissingTooltipTargetBehavior.AUTO_DISMISS,
  },
  xbutton: {
    color: 'Auto',
  },
  backdrop: {
    color: '#000000',
    opacity: 40,
    highlight: {
      type: 'outside',
      color: '#ffffff',
      radius: 4,
      spread: 0,
      opacity: 50,
    },
  },
  focusHighlight: {
    color: 'Auto',
    opacity: 100,
  },
  progress: {
    type: ProgressBarType.FULL_WIDTH,
    color: 'Auto',
    height: 2,
    enabled: true,
    position: ProgressBarPosition.TOP,
    dotsHeight: 6,
    narrowHeight: 5,
    numberedHeight: 12,
    chainRoundedHeight: 6,
    chainSquaredHeight: 4,
  },
  checklist: {
    width: 360,
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 20,
      positionOffsetY: 20,
    },
    checkmarkColor: '#4ade80',
    completedTaskTextDecoration: 'line-through',
  },
  banner: {
    backgroundColor: {
      background: 'Auto',
      color: '#FFFFFF',
      hover: 'Auto',
      active: 'Auto',
    },
    textColor: {
      background: '#FFFFFF',
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
    },
    padding: 8,
  },
  mainColor: {
    color: '#0f172a',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#e7eefd',
    autoActive: '#cedcfb',
    background: '#FFFFFF',
  },
  brandColor: {
    color: '#ffffff',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#4b7eee',
    autoActive: '#2055c9',
    background: '#2563eb',
  },
  launcherIcon: {
    size: 16,
    color: {
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
      background: '#1d4ed8',
    },
    opacity: 100,
  },
  launcherButtons: {
    px: 16,
    height: 32,
    borderRadius: 8,
    primary: {
      border: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        enabled: false,
        borderWidth: 1,
      },
      textColor: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#FFFFFF',
      },
      fontWeight: 600,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
  },
  launcherBeacon: {
    size: 16,
    color: '#facc15',
  },
  checklistLauncher: {
    color: {
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
      background: 'Auto',
    },
    height: 60,
    counter: {
      color: 'Auto',
      background: 'Auto',
    },
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 100,
      positionOffsetY: 20,
    },
    fontWeight: 600,
    borderRadius: 30,
  },
  bubble: {
    width: 300,
    placement: {
      position: 'leftBottom' as ModalPosition,
      positionOffsetX: 20,
      positionOffsetY: 20,
    },
  },
  avatar: {
    type: AvatarType.CARTOON,
    size: 60,
    url: '',
    name: 'alex',
  },
  resourceCenter: {
    placement: 'bottom-right',
    offsetX: 20,
    offsetY: 20,
    normalWidth: 360,
    largeWidth: 480,
    transitionDuration: 450,
    dividerLines: true,
    headerBackground: {
      type: 'color',
      color: 'Auto',
      gradientFrom: 'Auto',
      gradientTo: 'Auto',
      imageUrl: '',
    },
  },
  resourceCenterLauncherButton: {
    iconType: 'default-question-mark',
    height: 60,
    imageHeight: 50,
    borderRadius: null,
    textMode: 'active-checklist-text',
    showRemainingTasks: true,
  },
  resourceCenterUnreadBadge: {
    backgroundColor: '#ef4444',
    textColor: '#ffffff',
  },
};

export const standardDarkSettings: ThemeTypesSetting = {
  font: {
    fontSize: 16,
    linkColor: 'Auto',
    fontFamily: 'System font',
    h1FontSize: 24,
    h2FontSize: 20,
    lineHeight: 24,
    fontWeightBold: 600,
    fontWeightNormal: 400,
  },
  modal: {
    width: 600,
    padding: 40,
    backdropClickBehavior: ModalBackdropClickBehavior.DO_NOTHING,
  },
  border: {
    borderColor: 'Auto',
    borderWidth: 1,
    borderRadius: '10',
    borderWidthEnabled: false,
  },
  survey: {
    color: 'Auto',
  },
  buttons: {
    px: 16,
    height: 32,
    primary: {
      border: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        enabled: false,
        borderWidth: 1,
      },
      textColor: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#FFFFFF',
      },
      fontWeight: 600,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    minWidth: 0,
    secondary: {
      border: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        enabled: true,
        borderWidth: 1,
      },
      textColor: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#FFFFFF',
      },
      fontWeight: 600,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    borderRadius: 8,
  },
  tooltip: {
    width: 300,
    notchSize: 20,
    missingTargetTolerance: 3,
    missingTargetBehavior: MissingTooltipTargetBehavior.AUTO_DISMISS,
  },
  xbutton: {
    color: 'Auto',
  },
  backdrop: {
    color: '#000000',
    opacity: 40,
    highlight: {
      type: 'outside',
      color: '#ffffff',
      radius: 4,
      spread: 0,
      opacity: 50,
    },
  },
  focusHighlight: {
    color: 'Auto',
    opacity: 100,
  },
  progress: {
    type: ProgressBarType.FULL_WIDTH,
    color: 'Auto',
    height: 2,
    enabled: true,
    position: ProgressBarPosition.TOP,
    dotsHeight: 6,
    narrowHeight: 5,
    numberedHeight: 12,
    chainRoundedHeight: 6,
    chainSquaredHeight: 4,
  },
  checklist: {
    width: 360,
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 20,
      positionOffsetY: 20,
    },
    checkmarkColor: '#4ade80',
    completedTaskTextDecoration: 'line-through',
  },
  banner: {
    backgroundColor: {
      background: 'Auto',
      color: '#FFFFFF',
      hover: 'Auto',
      active: 'Auto',
    },
    textColor: {
      background: '#FFFFFF',
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
    },
    padding: 8,
  },
  mainColor: {
    color: '#ffffff',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#142854',
    autoActive: '#19387f',
    background: '#0f172a',
  },
  brandColor: {
    color: '#ffffff',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#4b7eee',
    autoActive: '#2055c9',
    background: '#2563eb',
  },
  launcherIcon: {
    size: 16,
    color: {
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
      background: '#1d4ed8',
    },
    opacity: 100,
  },
  launcherButtons: {
    px: 16,
    height: 32,
    borderRadius: 8,
    primary: {
      border: {
        color: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        enabled: false,
        borderWidth: 1,
      },
      textColor: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#FFFFFF',
      },
      fontWeight: 600,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
  },
  launcherBeacon: {
    size: 16,
    color: '#facc15',
  },
  checklistLauncher: {
    color: {
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
      background: 'Auto',
    },
    height: 60,
    counter: {
      color: 'Auto',
      background: 'Auto',
    },
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 100,
      positionOffsetY: 20,
    },
    fontWeight: 600,
    borderRadius: 30,
  },
  bubble: {
    width: 300,
    placement: {
      position: 'leftBottom' as ModalPosition,
      positionOffsetX: 20,
      positionOffsetY: 20,
    },
  },
  avatar: {
    type: AvatarType.CARTOON,
    size: 60,
    url: '',
    name: 'alex',
  },
  resourceCenter: {
    placement: 'bottom-right',
    offsetX: 20,
    offsetY: 20,
    normalWidth: 360,
    largeWidth: 480,
    transitionDuration: 450,
    dividerLines: true,
    headerBackground: {
      type: 'color',
      color: 'Auto',
      gradientFrom: 'Auto',
      gradientTo: 'Auto',
      imageUrl: '',
    },
  },
  resourceCenterLauncherButton: {
    iconType: 'default-question-mark',
    height: 60,
    imageHeight: 50,
    borderRadius: null,
    textMode: 'active-checklist-text',
    showRemainingTasks: true,
  },
  resourceCenterUnreadBadge: {
    backgroundColor: '#ef4444',
    textColor: '#ffffff',
  },
};
