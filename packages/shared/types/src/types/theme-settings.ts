import { ContentModalPlacementData, ModalPosition } from './contents';

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
  checklist: {
    checkmarkColor: string;
    width: number;
    placement: ContentModalPlacementData;
    zIndex?: number;
    completedTaskTextDecoration?: string;
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
  };
  modal: {
    width: number;
    padding: number;
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
};
