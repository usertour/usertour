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

// export const defaultSettings_old: ThemeTypesSetting = {
//   brandColor: {
//     color: '#f8fafc',
//     background: '#1d4ed8',
//     hover: 'Auto',
//     autoHover: '#3162ec',
//     autoActive: '#4576ff',
//     active: 'Auto',
//   },
//   mainColor: {
//     color: '#020617',
//     background: '#FFFFFF',
//     autoHover: '#ffffff',
//     autoActive: '#ffffff',
//     hover: 'Auto',
//     active: 'Auto',
//   },
//   font: {
//     fontFamily: 'System font',
//     fontSize: 14,
//     lineHeight: 20,
//     fontWeightNormal: 300,
//     fontWeightBold: 500,
//     h1FontSize: 18,
//     h2FontSize: 24,
//     linkColor: '#7ed321',
//   },
//   border: {
//     borderRadius: '8',
//     borderWidthEnabled: false,
//     borderWidth: 1,
//     borderColor: '#50e3c2',
//   },
//   xbutton: {
//     color: '#f5a623',
//   },
//   progress: {
//     enabled: true,
//     color: '#f5a623',
//     height: 2,
//     type: ProgressBarType.FULL_WIDTH,
//     position: ProgressBarPosition.TOP,
//     narrowHeight: 5,
//     chainSquaredHeight: 4,
//     chainRoundedHeight: 6,
//     dotsHeight: 10,
//     numberedHeight: 12,
//   },
//   survey: {
//     color: '#1d4ed8',
//   },
//   launcherBeacon: {
//     color: '#1d4ed8',
//     size: 10,
//   },
//   launcherIcon: {
//     color: {
//       color: '#1d4ed8',
//       background: '#1d4ed8',
//       hover: '#1d4ed8',
//       active: '#1d4ed8',
//     },
//     opacity: 100,
//     size: 10,
//   },
//   checklist: {
//     checkmarkColor: '#1d4ed8',
//     width: 360,
//     placement: {
//       position: 'rightBottom' as ModalPosition,
//       positionOffsetX: 100,
//       positionOffsetY: 20,
//     },
//   },
//   checklistLauncher: {
//     borderRadius: 24,
//     height: 48,
//     fontWeight: 400,
//     placement: {
//       position: 'rightBottom' as ModalPosition,
//       positionOffsetX: 100,
//       positionOffsetY: 20,
//     },
//     counter: {
//       color: 'Auto',
//       background: 'Auto',
//     },
//     color: {
//       color: 'Auto',
//       background: 'Auto',
//       hover: 'Auto',
//       active: 'Auto',
//     },
//   },
//   buttons: {
//     height: 24,
//     minWidth: 80,
//     borderRadius: 3,
//     px: 4,
//     primary: {
//       fontWeight: 400,
//       textColor: {
//         color: 'Auto',
//         background: '#FFFFFF',
//         hover: 'Auto',
//         active: 'Auto',
//       },
//       backgroundColor: {
//         color: '#FFFFFF',
//         background: 'Auto',
//         hover: 'Auto',
//         active: 'Auto',
//       },
//       border: {
//         enabled: false,
//         borderWidth: 1,
//         color: {
//           color: '#417505',
//           background: '#FFFFFF',
//           hover: '#7ed321',
//           active: '#9013fe',
//         },
//       },
//     },
//     secondary: {
//       fontWeight: 400,
//       textColor: {
//         color: 'Auto',
//         background: '#FFFFFF',
//         hover: 'Auto',
//         active: 'Auto',
//       },
//       backgroundColor: {
//         color: '#FFFFFF',
//         background: 'Auto',
//         hover: 'Auto',
//         active: 'Auto',
//       },
//       border: {
//         enabled: true,
//         borderWidth: 1,
//         color: {
//           color: 'Auto',
//           background: '#FFFFFF',
//           hover: 'Auto',
//           active: 'Auto',
//         },
//       },
//     },
//   },
//   tooltip: {
//     width: 300,
//     notchSize: 20,
//   },
//   modal: {
//     width: 500,
//     padding: 10,
//   },
//   backdrop: {
//     color: '#020617',
//     opacity: 18,
//     highlight: {
//       type: 'outside',
//       radius: 3,
//       spread: 3,
//       color: '#8b572a',
//       opacity: 10,
//     },
//   },
// };

export const defaultSettings: ThemeTypesSetting = {
  font: {
    fontSize: 14,
    linkColor: '#7ed321',
    fontFamily: 'System font',
    h1FontSize: 18,
    h2FontSize: 24,
    lineHeight: 20,
    fontWeightBold: 500,
    fontWeightNormal: 300,
  },
  modal: { width: 500, padding: 10 },
  border: {
    borderColor: '#50e3c2',
    borderWidth: 1,
    borderRadius: '8',
    borderWidthEnabled: false,
  },
  buttons: {
    height: 24,
    px: 4,
    primary: {
      border: {
        color: {
          color: '#417505',
          hover: '#7ed321',
          active: '#9013fe',
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
      fontWeight: 400,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    minWidth: 80,
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
      fontWeight: 400,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    borderRadius: 3,
  },
  tooltip: { width: 300, notchSize: 20 },
  xbutton: { color: 'Auto' },
  progress: {
    enabled: true,
    color: 'Auto',
    type: ProgressBarType.FULL_WIDTH,
    position: ProgressBarPosition.TOP,
    height: 2,
    narrowHeight: 5,
    chainSquaredHeight: 4,
    chainRoundedHeight: 6,
    dotsHeight: 10,
    numberedHeight: 12,
  },
  survey: {
    color: '#1d4ed8',
  },
  launcherBeacon: {
    color: '#1d4ed8',
    size: 16,
  },
  launcherIcon: {
    color: {
      color: '#1d4ed8',
      background: '#1d4ed8',
      hover: '#1d4ed8',
      active: '#1d4ed8',
    },
    opacity: 100,
    size: 16,
  },
  checklist: {
    width: 360,
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 100,
      positionOffsetY: 20,
    },
    checkmarkColor: '#4ade80',
    completedTaskTextDecoration: 'line-through',
  },
  checklistLauncher: {
    color: {
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
      background: 'Auto',
    },
    height: 48,
    counter: {
      color: 'Auto',
      background: 'Auto',
    },
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 100,
      positionOffsetY: 20,
    },
    fontWeight: 400,
    borderRadius: 24,
  },
  backdrop: {
    color: '#020617',
    opacity: 18,
    highlight: {
      type: 'inside',
      color: '#8b572a',
      radius: 3,
      spread: 3,
      opacity: 10,
    },
  },
  mainColor: {
    color: '#020617',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#ffffff',
    autoActive: '#ffffff',
    background: '#FFFFFF',
  },
  brandColor: {
    color: '#f8fafc',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#3162ec',
    autoActive: '#4576ff',
    background: '#1d4ed8',
  },
};

export const standardDarkSettings: ThemeTypesSetting = {
  font: {
    fontSize: 14,
    linkColor: '#7ed321',
    fontFamily: 'System font',
    h1FontSize: 18,
    h2FontSize: 24,
    lineHeight: 20,
    fontWeightBold: 500,
    fontWeightNormal: 300,
  },
  modal: { width: 500, padding: 10 },
  border: {
    borderColor: '#50e3c2',
    borderWidth: 1,
    borderRadius: '8',
    borderWidthEnabled: false,
  },
  buttons: {
    height: 24,
    px: 4,
    primary: {
      border: {
        color: {
          color: '#417505',
          hover: '#7ed321',
          active: '#9013fe',
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
      fontWeight: 400,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    minWidth: 80,
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
      fontWeight: 400,
      backgroundColor: {
        color: '#FFFFFF',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
    },
    borderRadius: 3,
  },
  tooltip: { width: 300, notchSize: 20 },
  xbutton: { color: 'Auto' },
  progress: {
    enabled: true,
    color: 'Auto',
    type: ProgressBarType.FULL_WIDTH,
    position: ProgressBarPosition.TOP,
    height: 2,
    narrowHeight: 5,
    chainSquaredHeight: 4,
    chainRoundedHeight: 6,
    dotsHeight: 10,
    numberedHeight: 12,
  },
  survey: {
    color: '#1d4ed8',
  },
  launcherBeacon: {
    color: '#1d4ed8',
    size: 16,
  },
  launcherIcon: {
    color: {
      color: '#1d4ed8',
      background: '#1d4ed8',
      hover: '#1d4ed8',
      active: '#1d4ed8',
    },
    opacity: 100,
    size: 16,
  },
  checklist: {
    width: 360,
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 100,
      positionOffsetY: 20,
    },
    checkmarkColor: '#4ade80',
    completedTaskTextDecoration: 'line-through',
  },
  checklistLauncher: {
    color: {
      color: 'Auto',
      hover: 'Auto',
      active: 'Auto',
      background: 'Auto',
    },
    height: 48,
    counter: {
      color: 'Auto',
      background: 'Auto',
    },
    placement: {
      position: 'rightBottom' as ModalPosition,
      positionOffsetX: 100,
      positionOffsetY: 20,
    },
    fontWeight: 400,
    borderRadius: 24,
  },
  backdrop: {
    color: '#020617',
    opacity: 18,
    highlight: {
      type: 'inside',
      color: '#8b572a',
      radius: 3,
      spread: 3,
      opacity: 10,
    },
  },
  mainColor: {
    color: '#f8fafc',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#161a2b',
    autoActive: '#2a2e3f',
    background: '#020617',
  },
  brandColor: {
    color: '#f8fafc',
    hover: 'Auto',
    active: 'Auto',
    autoHover: '#3162ec',
    autoActive: '#4576ff',
    background: '#1d4ed8',
  },
};
