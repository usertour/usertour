import { ThemeTypesSetting, defaultSettings } from '@usertour/types';
import { convertSettings, convertToCssVars, mergeThemeDefaultSettings } from '../convert-settings';

// Store original defaultSettings values for reference mutation tests
const originalDefaultMainColorHover = defaultSettings.mainColor.hover;
const originalDefaultBrandColorHover = defaultSettings.brandColor.hover;

/**
 * Test suite for convert-settings module
 *
 * Two layers of fallback mechanism:
 * 1. defaultSettings - fills in missing fields via deepmerge
 * 2. Auto resolution - resolves 'Auto' values to their computed fallback values
 */
describe('convert-settings', () => {
  // Complete minimal settings for testing
  const completeSettings: ThemeTypesSetting = {
    mainColor: {
      background: '#FFFFFF',
      color: '#0f172a',
      hover: 'Auto',
      active: 'Auto',
      autoHover: '#e7eefd',
      autoActive: '#cedcfb',
    },
    brandColor: {
      background: '#2563eb',
      color: '#ffffff',
      hover: 'Auto',
      active: 'Auto',
      autoHover: '#4b7eee',
      autoActive: '#2055c9',
    },
    font: {
      fontFamily: 'System font',
      fontSize: 16,
      lineHeight: 24,
      fontWeightNormal: 400,
      fontWeightBold: 600,
      h1FontSize: 24,
      h2FontSize: 20,
      linkColor: 'Auto',
    },
    border: {
      borderRadius: '10',
      borderWidthEnabled: false,
      borderWidth: 1,
      borderColor: 'Auto',
    },
    xbutton: {
      color: 'Auto',
    },
    progress: {
      enabled: true,
      color: 'Auto',
      height: 2,
      type: 'full-width' as any,
      position: 'top' as any,
      narrowHeight: 5,
      chainSquaredHeight: 4,
      chainRoundedHeight: 6,
      dotsHeight: 6,
      numberedHeight: 12,
    },
    survey: {
      color: 'Auto',
    },
    launcherBeacon: {
      color: 'Auto',
      size: 16,
    },
    launcherIcon: {
      color: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: '#1d4ed8',
      },
      opacity: 100,
      size: 16,
    },
    checklist: {
      checkmarkColor: '#4ade80',
      width: 360,
      placement: {
        position: 'rightBottom' as any,
        positionOffsetX: 20,
        positionOffsetY: 20,
      },
    },
    checklistLauncher: {
      borderRadius: 30,
      height: 60,
      fontWeight: 600,
      placement: {
        position: 'rightBottom' as any,
        positionOffsetX: 100,
        positionOffsetY: 20,
      },
      color: {
        color: 'Auto',
        hover: 'Auto',
        active: 'Auto',
        background: 'Auto',
      },
      counter: {
        color: 'Auto',
        background: 'Auto',
      },
    },
    buttons: {
      height: 32,
      minWidth: 0,
      px: 16,
      borderRadius: 8,
      primary: {
        fontWeight: 600,
        textColor: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        backgroundColor: {
          color: '#FFFFFF',
          hover: 'Auto',
          active: 'Auto',
          background: 'Auto',
        },
        border: {
          enabled: false,
          borderWidth: 1,
          color: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
        },
      },
      secondary: {
        fontWeight: 600,
        textColor: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        backgroundColor: {
          color: '#FFFFFF',
          hover: 'Auto',
          active: 'Auto',
          background: 'Auto',
        },
        border: {
          enabled: true,
          borderWidth: 1,
          color: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
        },
      },
    },
    launcherButtons: {
      height: 32,
      width: 0,
      px: 16,
      borderRadius: 8,
      primary: {
        fontWeight: 600,
        textColor: {
          color: 'Auto',
          hover: 'Auto',
          active: 'Auto',
          background: '#FFFFFF',
        },
        backgroundColor: {
          color: '#FFFFFF',
          hover: 'Auto',
          active: 'Auto',
          background: 'Auto',
        },
        border: {
          enabled: false,
          borderWidth: 1,
          color: {
            color: 'Auto',
            hover: 'Auto',
            active: 'Auto',
            background: '#FFFFFF',
          },
        },
      },
    },
    tooltip: {
      width: 300,
      notchSize: 20,
    },
    modal: {
      width: 600,
      padding: 40,
    },
    backdrop: {
      color: '#000000',
      opacity: 40,
      highlight: {
        type: 'outside',
        radius: 4,
        spread: 0,
        color: '#ffffff',
        opacity: 50,
      },
    },
  };

  describe('mergeThemeDefaultSettings', () => {
    it('should merge with defaultSettings for empty input', () => {
      const result = mergeThemeDefaultSettings({} as ThemeTypesSetting);

      // Should have all required fields from defaultSettings
      expect(result.mainColor).toBeDefined();
      expect(result.brandColor).toBeDefined();
      expect(result.buttons).toBeDefined();
      expect(result.font).toBeDefined();
    });

    it('should override defaultSettings with provided values', () => {
      const customSettings = {
        mainColor: {
          background: '#000000',
          color: '#ffffff',
          hover: '#333333',
          active: '#666666',
        },
      } as ThemeTypesSetting;

      const result = mergeThemeDefaultSettings(customSettings);

      expect(result.mainColor.background).toBe('#000000');
      expect(result.mainColor.color).toBe('#ffffff');
    });
  });

  describe('convertSettings - Auto value resolution', () => {
    describe('mainColor Auto values', () => {
      it('should resolve mainColor.hover from autoHover when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.mainColor.hover).toBe(completeSettings.mainColor.autoHover);
      });

      it('should resolve mainColor.active from autoActive when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.mainColor.active).toBe(completeSettings.mainColor.autoActive);
      });

      it('should keep custom hover value when not Auto', () => {
        const settings = {
          ...completeSettings,
          mainColor: {
            ...completeSettings.mainColor,
            hover: '#custom123',
          },
        };
        const result = convertSettings(settings);
        expect(result.mainColor.hover).toBe('#custom123');
      });
    });

    describe('brandColor Auto values', () => {
      it('should resolve brandColor.hover from autoHover when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.brandColor.hover).toBe(completeSettings.brandColor.autoHover);
      });

      it('should resolve brandColor.active from autoActive when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.brandColor.active).toBe(completeSettings.brandColor.autoActive);
      });
    });

    describe('border Auto values', () => {
      it('should resolve border.borderColor from mainColor.color when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.border.borderColor).toBe(completeSettings.mainColor.color);
      });
    });

    describe('primary button Auto values', () => {
      it('should resolve primary button textColor from brandColor.color when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.buttons.primary.textColor.color).toBe(completeSettings.brandColor.color);
        expect(result.buttons.primary.textColor.hover).toBe(completeSettings.brandColor.color);
        expect(result.buttons.primary.textColor.active).toBe(completeSettings.brandColor.color);
      });

      it('should resolve primary button backgroundColor from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.buttons.primary.backgroundColor.background).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.buttons.primary.backgroundColor.hover).toBe(
          completeSettings.brandColor.autoHover,
        );
        expect(result.buttons.primary.backgroundColor.active).toBe(
          completeSettings.brandColor.autoActive,
        );
      });

      it('should resolve primary button border.color from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.buttons.primary.border.color.color).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.buttons.primary.border.color.hover).toBe(
          completeSettings.brandColor.autoHover,
        );
        expect(result.buttons.primary.border.color.active).toBe(
          completeSettings.brandColor.autoActive,
        );
      });
    });

    describe('secondary button Auto values', () => {
      it('should resolve secondary button textColor from brandColor.background when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.buttons.secondary.textColor.color).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.buttons.secondary.textColor.hover).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.buttons.secondary.textColor.active).toBe(
          completeSettings.brandColor.background,
        );
      });

      it('should resolve secondary button backgroundColor from mainColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.buttons.secondary.backgroundColor.background).toBe(
          completeSettings.mainColor.background,
        );
        expect(result.buttons.secondary.backgroundColor.hover).toBe(
          completeSettings.mainColor.autoHover,
        );
        expect(result.buttons.secondary.backgroundColor.active).toBe(
          completeSettings.mainColor.autoActive,
        );
      });

      it('should resolve secondary button border.color from brandColor.background when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.buttons.secondary.border.color.color).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.buttons.secondary.border.color.hover).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.buttons.secondary.border.color.active).toBe(
          completeSettings.brandColor.background,
        );
      });
    });

    describe('font Auto values', () => {
      it('should resolve font.linkColor from brandColor.background when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.font.linkColor).toBe(completeSettings.brandColor.background);
      });
    });

    describe('xbutton Auto values', () => {
      it('should resolve xbutton.color from mainColor.color when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.xbutton.color).toBe(completeSettings.mainColor.color);
      });
    });

    describe('progress Auto values', () => {
      it('should resolve progress.color from brandColor.background when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.progress.color).toBe(completeSettings.brandColor.background);
      });
    });

    describe('launcherBeacon Auto values', () => {
      it('should resolve launcherBeacon.color from brandColor.background when set to Auto', () => {
        const settings = {
          ...completeSettings,
          launcherBeacon: {
            ...completeSettings.launcherBeacon,
            color: 'Auto',
          },
        };
        const result = convertSettings(settings);
        expect(result.launcherBeacon.color).toBe(completeSettings.brandColor.background);
      });
    });

    describe('launcherIcon Auto values', () => {
      it('should resolve launcherIcon.color values from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.launcherIcon.color.color).toBe(completeSettings.brandColor.background);
        expect(result.launcherIcon.color.hover).toBe(completeSettings.brandColor.autoHover);
        expect(result.launcherIcon.color.active).toBe(completeSettings.brandColor.autoActive);
      });
    });

    describe('checklistLauncher Auto values', () => {
      it('should resolve checklistLauncher.color values from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.checklistLauncher.color.color).toBe(completeSettings.brandColor.color);
        expect(result.checklistLauncher.color.background).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.checklistLauncher.color.hover).toBe(completeSettings.brandColor.autoHover);
        expect(result.checklistLauncher.color.active).toBe(completeSettings.brandColor.autoActive);
      });

      it('should resolve checklistLauncher.counter values from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.checklistLauncher.counter.color).toBe(completeSettings.brandColor.background);
        expect(result.checklistLauncher.counter.background).toBe(completeSettings.brandColor.color);
      });
    });

    describe('survey Auto values', () => {
      it('should resolve survey.color from brandColor.background when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.survey.color).toBe(completeSettings.brandColor.background);
      });
    });

    describe('launcherButtons Auto values', () => {
      it('should resolve launcherButtons primary textColor from brandColor.color when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.launcherButtons.primary.textColor.color).toBe(
          completeSettings.brandColor.color,
        );
        expect(result.launcherButtons.primary.textColor.hover).toBe(
          completeSettings.brandColor.color,
        );
        expect(result.launcherButtons.primary.textColor.active).toBe(
          completeSettings.brandColor.color,
        );
      });

      it('should resolve launcherButtons primary backgroundColor from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.launcherButtons.primary.backgroundColor.background).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.launcherButtons.primary.backgroundColor.hover).toBe(
          completeSettings.brandColor.autoHover,
        );
        expect(result.launcherButtons.primary.backgroundColor.active).toBe(
          completeSettings.brandColor.autoActive,
        );
      });

      it('should resolve launcherButtons primary border.color from brandColor when set to Auto', () => {
        const result = convertSettings(completeSettings);
        expect(result.launcherButtons.primary.border.color.color).toBe(
          completeSettings.brandColor.background,
        );
        expect(result.launcherButtons.primary.border.color.hover).toBe(
          completeSettings.brandColor.autoHover,
        );
        expect(result.launcherButtons.primary.border.color.active).toBe(
          completeSettings.brandColor.autoActive,
        );
      });
    });

    describe('font family handling', () => {
      it('should convert System font to full font family string', () => {
        const result = convertSettings(completeSettings);
        expect(result.font.fontFamily).toContain('apple-system');
        expect(result.font.fontFamily).toContain('Segoe UI');
      });

      it('should append sans-serif to custom font family', () => {
        const settings = {
          ...completeSettings,
          font: {
            ...completeSettings.font,
            fontFamily: 'CustomFont',
          },
        };
        const result = convertSettings(settings);
        expect(result.font.fontFamily).toContain('CustomFont');
        expect(result.font.fontFamily).toContain('sans-serif');
      });
    });
  });

  describe('convertSettings - Missing data fallback (defaultSettings layer)', () => {
    it('should handle empty settings object with defaultSettings fallback', () => {
      const result = convertSettings({} as ThemeTypesSetting);

      // Should have all required fields
      expect(result.mainColor).toBeDefined();
      expect(result.brandColor).toBeDefined();
      expect(result.buttons).toBeDefined();
      expect(result.font).toBeDefined();
      expect(result.border).toBeDefined();
    });

    it('should handle missing mainColor with defaultSettings fallback', () => {
      const settings = { brandColor: completeSettings.brandColor } as ThemeTypesSetting;
      const result = convertSettings(settings);

      // mainColor should come from defaultSettings
      expect(result.mainColor.background).toBe(defaultSettings.mainColor.background);
    });

    it('should handle missing buttons with defaultSettings fallback', () => {
      const settings = {
        mainColor: completeSettings.mainColor,
        brandColor: completeSettings.brandColor,
      } as ThemeTypesSetting;
      const result = convertSettings(settings);

      // buttons should come from defaultSettings
      expect(result.buttons.height).toBe(defaultSettings.buttons.height);
      expect(result.buttons.primary).toBeDefined();
      expect(result.buttons.secondary).toBeDefined();
    });

    it('should handle missing nested properties with defaultSettings fallback', () => {
      const settings = {
        buttons: {
          height: 40,
          // missing primary and secondary
        },
      } as ThemeTypesSetting;
      const result = convertSettings(settings);

      // Custom height should be preserved
      expect(result.buttons.height).toBe(40);
      // Missing primary/secondary should come from defaultSettings
      expect(result.buttons.primary).toBeDefined();
      expect(result.buttons.secondary).toBeDefined();
    });

    it('should handle missing progress with defaultSettings fallback', () => {
      const settings = {
        mainColor: completeSettings.mainColor,
        brandColor: completeSettings.brandColor,
      } as ThemeTypesSetting;
      const result = convertSettings(settings);

      expect(result.progress).toBeDefined();
      expect(result.progress.height).toBe(defaultSettings.progress.height);
    });

    it('should handle missing checklistLauncher with defaultSettings fallback', () => {
      const settings = {
        mainColor: completeSettings.mainColor,
        brandColor: completeSettings.brandColor,
      } as ThemeTypesSetting;
      const result = convertSettings(settings);

      expect(result.checklistLauncher).toBeDefined();
      expect(result.checklistLauncher.borderRadius).toBe(
        defaultSettings.checklistLauncher.borderRadius,
      );
    });

    it('should handle missing launcherIcon with defaultSettings fallback', () => {
      const settings = {
        mainColor: completeSettings.mainColor,
        brandColor: completeSettings.brandColor,
      } as ThemeTypesSetting;
      const result = convertSettings(settings);

      expect(result.launcherIcon).toBeDefined();
      expect(result.launcherIcon.size).toBe(defaultSettings.launcherIcon.size);
    });

    it('should handle missing launcherButtons with defaultSettings fallback', () => {
      const settings = {
        mainColor: completeSettings.mainColor,
        brandColor: completeSettings.brandColor,
      } as ThemeTypesSetting;
      const result = convertSettings(settings);

      expect(result.launcherButtons).toBeDefined();
      expect(result.launcherButtons.height).toBe(defaultSettings.launcherButtons.height);
      expect(result.launcherButtons.width).toBe(defaultSettings.launcherButtons.width);
      expect(result.launcherButtons.px).toBe(defaultSettings.launcherButtons.px);
      expect(result.launcherButtons.borderRadius).toBe(
        defaultSettings.launcherButtons.borderRadius,
      );
      expect(result.launcherButtons.primary).toBeDefined();
    });
  });

  describe('convertSettings - Combined fallback (missing data + Auto resolution)', () => {
    it('should apply both defaultSettings fallback and Auto resolution for empty input', () => {
      const result = convertSettings({} as ThemeTypesSetting);

      // defaultSettings fallback
      expect(result.mainColor.background).toBe(defaultSettings.mainColor.background);

      // Auto resolution from defaultSettings values
      expect(result.mainColor.hover).toBe(defaultSettings.mainColor.autoHover);
      expect(result.mainColor.active).toBe(defaultSettings.mainColor.autoActive);
      expect(result.brandColor.hover).toBe(defaultSettings.brandColor.autoHover);
      expect(result.brandColor.active).toBe(defaultSettings.brandColor.autoActive);
    });

    it('should resolve Auto values using defaultSettings when source settings are missing', () => {
      const result = convertSettings({} as ThemeTypesSetting);

      // These should be resolved using defaultSettings values
      expect(result.border.borderColor).toBe(defaultSettings.mainColor.color);
      expect(result.xbutton.color).toBe(defaultSettings.mainColor.color);
      expect(result.font.linkColor).toBe(defaultSettings.brandColor.background);
      expect(result.progress.color).toBe(defaultSettings.brandColor.background);
    });

    it('should resolve button Auto values using defaultSettings when settings are missing', () => {
      const result = convertSettings({} as ThemeTypesSetting);

      // Primary button Auto resolution
      expect(result.buttons.primary.textColor.color).toBe(defaultSettings.brandColor.color);
      expect(result.buttons.primary.backgroundColor.background).toBe(
        defaultSettings.brandColor.background,
      );
      expect(result.buttons.primary.backgroundColor.hover).toBe(
        defaultSettings.brandColor.autoHover,
      );

      // Secondary button Auto resolution
      expect(result.buttons.secondary.textColor.color).toBe(defaultSettings.brandColor.background);
      expect(result.buttons.secondary.backgroundColor.background).toBe(
        defaultSettings.mainColor.background,
      );

      // Launcher button Auto resolution
      expect(result.launcherButtons.primary.textColor.color).toBe(defaultSettings.brandColor.color);
      expect(result.launcherButtons.primary.backgroundColor.background).toBe(
        defaultSettings.brandColor.background,
      );
      expect(result.launcherButtons.primary.backgroundColor.hover).toBe(
        defaultSettings.brandColor.autoHover,
      );
    });

    it('should handle partial settings with correct fallback chain', () => {
      const partialSettings = {
        mainColor: {
          background: '#FF0000',
          color: '#00FF00',
          hover: 'Auto',
          active: 'Auto',
          autoHover: '#FF5555',
          autoActive: '#FF9999',
        },
      } as ThemeTypesSetting;

      const result = convertSettings(partialSettings);

      // Custom mainColor values should be preserved
      expect(result.mainColor.background).toBe('#FF0000');
      // Auto values should be resolved from autoHover/autoActive
      expect(result.mainColor.hover).toBe('#FF5555');
      expect(result.mainColor.active).toBe('#FF9999');

      // brandColor should come from defaultSettings
      expect(result.brandColor.background).toBe(defaultSettings.brandColor.background);

      // border.borderColor should be resolved (not 'Auto')
      expect(result.border.borderColor).not.toBe('Auto');
      // It should be a valid color string
      expect(result.border.borderColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('convertToCssVars', () => {
    it('should generate CSS variables string for complete settings', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-background:');
      expect(css).toContain('--usertour-foreground:');
      expect(css).toContain('--usertour-primary:');
      expect(css).toContain('--usertour-secondary:');
      expect(css).toContain('--usertour-font-family:');
    });

    it('should include button CSS variables', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-primary-hover:');
      expect(css).toContain('--usertour-primary-active:');
      expect(css).toContain('--usertour-primary-foreground:');
      expect(css).toContain('--usertour-secondary-hover:');
      expect(css).toContain('--usertour-secondary-active:');
      expect(css).toContain('--usertour-secondary-foreground:');
    });

    it('should include backdrop CSS variables', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-backdrop-color-rgb:');
      expect(css).toContain('--usertour-backdrop-opacity:');
      expect(css).toContain('--usertour-backdrop-highlight-opacity:');
    });

    it('should include progress bar CSS variables', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-progress-bar-color:');
      expect(css).toContain('--usertour-progress-bar-height:');
    });

    it('should include checklist launcher CSS variables', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-checklist-trigger-background-color:');
      expect(css).toContain('--usertour-checklist-trigger-font-color:');
      expect(css).toContain('--usertour-checklist-trigger-counter-background-color:');
    });

    it('should include launcher icon CSS variables', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-widget-launcher-icon-color:');
      expect(css).toContain('--usertour-widget-launcher-icon-hover-color:');
      expect(css).toContain('--usertour-widget-beacon-color:');
    });

    it('should include launcher button CSS variables', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-launcher-button-height:');
      expect(css).toContain('--usertour-launcher-button-width:');
      expect(css).toContain('--usertour-launcher-button-horizontal-padding:');
      expect(css).toContain('--usertour-launcher-button-border-radius:');
      expect(css).toContain('--usertour-launcher-button-background-color:');
      expect(css).toContain('--usertour-launcher-button-hover-background-color:');
      expect(css).toContain('--usertour-launcher-button-active-background-color:');
      expect(css).toContain('--usertour-launcher-button-font-color:');
      expect(css).toContain('--usertour-launcher-button-hover-font-color:');
      expect(css).toContain('--usertour-launcher-button-active-font-color:');
      expect(css).toContain('--usertour-launcher-button-font-weight:');
      expect(css).toContain('--usertour-launcher-button-border-width:');
      expect(css).toContain('--usertour-launcher-button-border-color:');
      expect(css).toContain('--usertour-launcher-button-hover-border-color:');
      expect(css).toContain('--usertour-launcher-button-active-border-color:');
    });

    it('should set launcher button width to auto when width is 0', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-launcher-button-width:auto');
    });

    it('should set launcher button border width to 0px when border is disabled', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-launcher-button-border-width:0px');
    });

    it('should add modal padding for modal type', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings, 'modal');

      expect(css).toContain('--usertour-widget-popper-padding:');
      expect(css).toContain('40px');
    });

    it('should not add modal padding for tooltip type', () => {
      const convertedSettings = convertSettings(completeSettings);
      const css = convertToCssVars(convertedSettings, 'tooltip');

      // Modal padding should not be present (or should be undefined and thus not included)
      const modalPaddingMatch = css.match(/--usertour-widget-popper-padding:[^;]+;/);
      expect(modalPaddingMatch).toBeNull();
    });

    it('should add backdrop inset for inside highlight type', () => {
      const settings = {
        ...completeSettings,
        backdrop: {
          ...completeSettings.backdrop,
          highlight: {
            ...completeSettings.backdrop.highlight,
            type: 'inside',
          },
        },
      };
      const convertedSettings = convertSettings(settings);
      const css = convertToCssVars(convertedSettings);

      expect(css).toContain('--usertour-backdrop-highlight-inset:inset');
    });

    it('should work correctly with defaultSettings fallback for empty input', () => {
      const convertedSettings = convertSettings({} as ThemeTypesSetting);
      const css = convertToCssVars(convertedSettings);

      // Should still generate valid CSS
      expect(css).toContain('--usertour-background:');
      expect(css).toContain('--usertour-primary:');
      expect(css.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle undefined values in nested objects gracefully', () => {
      const settings = {
        mainColor: {
          background: '#FFFFFF',
          color: '#000000',
          // hover, active, autoHover, autoActive are undefined
        },
        brandColor: {
          background: '#2563eb',
          color: '#ffffff',
        },
      } as ThemeTypesSetting;

      // Should not throw
      expect(() => convertSettings(settings)).not.toThrow();

      const result = convertSettings(settings);
      // Auto resolution should handle undefined source values
      expect(result.mainColor).toBeDefined();
    });

    it('should handle partial settings without throwing', () => {
      const settings = {
        mainColor: completeSettings.mainColor,
        brandColor: completeSettings.brandColor,
        // progress is missing, not null
      } as ThemeTypesSetting;

      // Should not throw
      expect(() => convertSettings(settings)).not.toThrow();

      const result = convertSettings(settings);
      // progress should be filled from defaultSettings
      expect(result.progress).toBeDefined();
      expect(result.progress.color).toBe(completeSettings.brandColor.background);
    });

    it('should preserve non-Auto values throughout the conversion', () => {
      const settings = {
        ...completeSettings,
        mainColor: {
          ...completeSettings.mainColor,
          hover: '#custom-hover',
          active: '#custom-active',
        },
        buttons: {
          ...completeSettings.buttons,
          primary: {
            ...completeSettings.buttons.primary,
            textColor: {
              ...completeSettings.buttons.primary.textColor,
              color: '#custom-text',
            },
          },
        },
      };

      const result = convertSettings(settings);

      expect(result.mainColor.hover).toBe('#custom-hover');
      expect(result.mainColor.active).toBe('#custom-active');
      expect(result.buttons.primary.textColor.color).toBe('#custom-text');
    });

    it('should handle deeply nested missing properties', () => {
      const settings = {
        brandColor: completeSettings.brandColor,
        buttons: {
          primary: {
            textColor: {
              // only color is provided as non-Auto value
              color: '#FF0000',
              hover: 'Auto',
              active: 'Auto',
              background: '#FFFFFF',
            },
          },
        },
      } as ThemeTypesSetting;

      const result = convertSettings(settings);

      // Custom value should be preserved
      expect(result.buttons.primary.textColor.color).toBe('#FF0000');
      // Auto values should be resolved using brandColor
      expect(result.buttons.primary.textColor.hover).toBe(completeSettings.brandColor.color);
      expect(result.buttons.primary.backgroundColor).toBeDefined();
    });

    it('should fallback to defaultSettings when values are explicitly null', () => {
      const settings = {
        mainColor: {
          background: null,
          color: '#00FF00',
          hover: 'Auto',
          active: 'Auto',
          autoHover: null,
          autoActive: '#FF9999',
        },
        font: {
          fontSize: null,
          linkColor: 'Auto',
        },
      } as unknown as ThemeTypesSetting;

      const result = convertSettings(settings);

      // null values should fallback to defaultSettings
      expect(result.mainColor.background).toBe(defaultSettings.mainColor.background);
      expect(result.mainColor.autoHover).toBe(defaultSettings.mainColor.autoHover);
      expect(result.font.fontSize).toBe(defaultSettings.font.fontSize);

      // Non-null values should be preserved
      expect(result.mainColor.color).toBe('#00FF00');
      expect(result.mainColor.autoActive).toBe('#FF9999');
    });

    it('should fallback to defaultSettings when values are explicitly undefined', () => {
      const settings = {
        mainColor: {
          background: undefined,
          color: '#00FF00',
          hover: 'Auto',
          active: 'Auto',
        },
        buttons: {
          height: undefined,
          borderRadius: 16,
        },
      } as unknown as ThemeTypesSetting;

      const result = convertSettings(settings);

      // undefined values should fallback to defaultSettings
      expect(result.mainColor.background).toBe(defaultSettings.mainColor.background);
      expect(result.buttons.height).toBe(defaultSettings.buttons.height);

      // Defined values should be preserved
      expect(result.mainColor.color).toBe('#00FF00');
      expect(result.buttons.borderRadius).toBe(16);
    });

    it('should handle mixed null, undefined, and valid values correctly', () => {
      const settings = {
        mainColor: {
          background: null,
          color: undefined,
          hover: 'Auto',
          active: '#custom-active',
          autoHover: '#custom-auto-hover',
          autoActive: null,
        },
        progress: {
          enabled: true,
          color: null,
          height: undefined,
        },
      } as unknown as ThemeTypesSetting;

      const result = convertSettings(settings);

      // null/undefined should use defaults
      expect(result.mainColor.background).toBe(defaultSettings.mainColor.background);
      expect(result.mainColor.color).toBe(defaultSettings.mainColor.color);
      expect(result.mainColor.autoActive).toBe(defaultSettings.mainColor.autoActive);
      expect(result.progress.height).toBe(defaultSettings.progress.height);

      // Valid values should be preserved
      expect(result.mainColor.active).toBe('#custom-active');
      expect(result.mainColor.autoHover).toBe('#custom-auto-hover');
      expect(result.progress.enabled).toBe(true);

      // Auto resolution should work with fallback values
      expect(result.mainColor.hover).toBe('#custom-auto-hover');
      // progress.color 'Auto' should resolve to brandColor.background (from defaults)
      expect(result.progress.color).toBe(defaultSettings.brandColor.background);
    });

    it('should NOT mutate defaultSettings when converting settings', () => {
      // Call convertSettings multiple times with empty settings
      convertSettings({} as ThemeTypesSetting);
      convertSettings({} as ThemeTypesSetting);
      convertSettings({} as ThemeTypesSetting);

      // defaultSettings should remain unchanged (should still be 'Auto')
      expect(defaultSettings.mainColor.hover).toBe(originalDefaultMainColorHover);
      expect(defaultSettings.brandColor.hover).toBe(originalDefaultBrandColorHover);
      expect(defaultSettings.mainColor.hover).toBe('Auto');
      expect(defaultSettings.brandColor.hover).toBe('Auto');
    });

    it('should return independent objects on each call', () => {
      const result1 = convertSettings({} as ThemeTypesSetting);
      const result2 = convertSettings({} as ThemeTypesSetting);

      // Results should be different object instances
      expect(result1).not.toBe(result2);
      expect(result1.mainColor).not.toBe(result2.mainColor);
      expect(result1.brandColor).not.toBe(result2.brandColor);

      // Modifying result1 should not affect result2
      result1.mainColor.color = '#MODIFIED';
      expect(result2.mainColor.color).not.toBe('#MODIFIED');
    });
  });
});
