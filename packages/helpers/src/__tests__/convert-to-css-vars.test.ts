import { defaultSettings } from '@usertour/constants';
import { ThemeTypesSetting } from '@usertour/types';
import { convertSettings, convertToCssVars } from '../convert-settings';

/**
 * Value-level fidelity tests for convertToCssVars — the theme-settings →
 * `--usertour-*` CSS-variable mapping the SDK injects into its iframe.
 *
 * The master fixture below is FULLY resolved (no 'Auto' anywhere) with a
 * distinct value per field, so any swapped, dropped, or mis-suffixed mapping
 * entry fails loudly. Expected values are literals verified independently:
 * pure-hue hexes have exact hand-computable HSL forms, and the state-color
 * pairs match the generateStateColors JSDoc examples (see color.test.ts).
 *
 * convertSettings (Auto resolution) has its own suite in
 * convert-settings.test.ts; the pipeline tests at the bottom cover the
 * composition of the two.
 */

const parseCssVars = (css: string): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const decl of css.split(';')) {
    if (!decl) continue;
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    map[decl.slice(0, idx)] = decl.slice(idx + 1);
  }
  return map;
};

const resolvedSettings: ThemeTypesSetting = {
  mainColor: {
    background: '#ffffff',
    color: '#000000',
    hover: '#ff0000',
    active: '#00ff00',
  },
  brandColor: {
    background: '#0000ff',
    color: '#ffff00',
    hover: '#ff00ff',
    active: '#00ffff',
  },
  font: {
    fontFamily: 'TestFont, sans-serif',
    fontSize: 15,
    lineHeight: 26,
    fontWeightNormal: 410,
    fontWeightBold: 640,
    h1FontSize: 31,
    h2FontSize: 27,
    linkColor: '#ff8000',
  },
  border: {
    borderRadius: 11,
    borderWidthEnabled: true,
    borderWidth: 3,
    borderColor: '#111213',
  },
  xbutton: { color: '#654321' },
  progress: {
    enabled: true,
    color: '#123456',
    height: 2,
    type: 'full-width' as any,
    position: 'top' as any,
    narrowHeight: 5,
    chainSquaredHeight: 4,
    chainRoundedHeight: 6,
    dotsHeight: 7,
    numberedHeight: 12,
  },
  survey: { color: '#800080' },
  launcherBeacon: { color: '#404040', size: 23 },
  launcherIcon: {
    color: { color: '#101010', hover: '#202020', active: '#303030', background: '#1d4ed8' },
    opacity: 80,
    size: 19,
  },
  checklist: {
    checkmarkColor: '#717273',
    width: 360,
    placement: { position: 'rightBottom' as any, positionOffsetX: 20, positionOffsetY: 20 },
  },
  checklistLauncher: {
    borderRadius: 33,
    height: 57,
    fontWeight: 530,
    placement: { position: 'rightBottom' as any, positionOffsetX: 100, positionOffsetY: 20 },
    color: { color: '#ff0000', hover: '#575859', active: '#515253', background: '#545556' },
    counter: { color: '#646566', background: '#616263' },
  },
  buttons: {
    height: 41,
    minWidth: 73,
    px: 17,
    borderRadius: 9,
    primary: {
      fontWeight: 510,
      textColor: { color: '#b1b2b3', hover: '#b4b5b6', active: '#b7b8b9', background: '#ffffff' },
      backgroundColor: {
        color: '#ffffff',
        hover: '#a4a5a6',
        active: '#a7a8a9',
        background: '#a1a2a3',
      },
      border: {
        enabled: true,
        borderWidth: 2,
        color: { color: '#c1c2c3', hover: '#c4c5c6', active: '#c7c8c9', background: '#ffffff' },
      },
    },
    secondary: {
      fontWeight: 520,
      textColor: { color: '#e1e2e3', hover: '#e4e5e6', active: '#e7e8e9', background: '#ffffff' },
      backgroundColor: {
        color: '#ffffff',
        hover: '#d4d5d6',
        active: '#d7d8d9',
        background: '#d1d2d3',
      },
      border: {
        enabled: false,
        borderWidth: 5,
        color: { color: '#f1f2f3', hover: '#f4f5f6', active: '#f7f8f9', background: '#ffffff' },
      },
    },
  },
  launcherButtons: {
    height: 37,
    width: 121,
    px: 18,
    borderRadius: 14,
    primary: {
      fontWeight: 540,
      textColor: { color: '#a9aaab', hover: '#acadae', active: '#afb0b1', background: '#ffffff' },
      backgroundColor: {
        color: '#ffffff',
        hover: '#949596',
        active: '#979899',
        background: '#919293',
      },
      border: {
        enabled: true,
        borderWidth: 4,
        color: { color: '#b9babb', hover: '#bcbdbe', active: '#bfc0c1', background: '#ffffff' },
      },
    },
  },
  tooltip: {
    width: 300,
    notchSize: 20,
    missingTargetTolerance: 3,
    missingTargetBehavior: 'auto-dismiss' as any,
  },
  modal: { width: 600, padding: 44, backdropClickBehavior: 'do-nothing' as any },
  backdrop: {
    color: '#336699',
    opacity: 40,
    highlight: { type: 'outside', radius: 4, spread: 2, color: '#663399', opacity: 50 },
  },
  banner: {
    backgroundColor: {
      background: '#ffff00',
      color: '#ffffff',
      hover: '#ff00ff',
      active: '#00ffff',
    },
    textColor: { background: '#ffffff', color: '#ff0000', hover: '#00ff00', active: '#0000ff' },
    padding: 13,
    animationDuration: 320,
    animationTiming: 'smooth',
  },
  focusHighlight: { color: '#00ff00', opacity: 50 },
  resourceCenter: {
    placement: 'bottom-right',
    offsetX: 20,
    offsetY: 20,
    normalWidth: 331,
    largeWidth: 441,
    maxHeight: 507,
    transitionDuration: 222,
    dividerLines: true,
    headerBackground: {
      type: 'color',
      color: '#00ffff',
      gradientFrom: '',
      gradientTo: '',
      imageUrl: '',
    },
    logoUrl: '',
  },
  resourceCenterLauncherButton: {
    iconType: 'default-question-mark',
    height: 61,
    imageHeight: 29,
    borderRadius: 15,
    textMode: 'resource-center-text',
    color: { background: '#0000ff', hover: '#ff00ff', active: '#00ffff', foreground: '#ffff00' },
  },
  resourceCenterUnreadBadge: { backgroundColor: '#ff0000', textColor: '#818283' },
  bubble: {
    width: 300,
    placement: { position: 'leftBottom' as any, positionOffsetX: 20, positionOffsetY: 20 },
  },
  avatar: { type: 'cartoon' as any, size: 60, url: '', name: '' },
} as ThemeTypesSetting;

// The complete expected variable set for the fixture above (tooltip type):
// 119 variables. Any mapping entry added, removed, or rewired in
// convertToCssVars must update this table — that is the tripwire.
const expectedTooltipVars: Record<string, string> = {
  '--usertour-background': '0 0% 100%',
  '--usertour-foreground': '0 0% 0%',
  '--usertour-brand-background-color': '240 100% 50%',
  '--usertour-brand-foreground-color': '60 100% 50%',
  '--usertour-brand-active-background-color': '180 100% 50%',
  '--usertour-brand-hover-background-color': '300 100% 50%',
  '--usertour-font-family': 'TestFont, sans-serif',
  '--usertour-font-size': '15px',
  '--usertour-main-hover-background-color': '0 100% 50%',
  '--usertour-main-active-background-color': '120 100% 50%',
  '--usertour-line-height': '26px',
  '--usertour-widget-popper-border-radius': '11px',
  '--usertour-font-weight-normal': '410',
  '--usertour-font-weight-bold': '640',
  '--usertour-h1-font-size': '31px',
  '--usertour-h2-font-size': '27px',
  '--usertour-link-color': '30.12 100% 50%',
  '--usertour-widget-popper-border-width': '3px',
  '--usertour-widget-popper-border-color': '#111213',
  '--usertour-button-border-radius': '9px',
  '--usertour-button-height': '41px',
  '--usertour-button-min-width': '73px',
  '--usertour-button-px': '17px',
  '--usertour-primary': '#a1a2a3',
  '--usertour-primary-hover': '#a4a5a6',
  '--usertour-primary-active': '#a7a8a9',
  '--usertour-primary-foreground': '#b1b2b3',
  '--usertour-primary-foreground-hover': '#b4b5b6',
  '--usertour-primary-foreground-active': '#b7b8b9',
  '--usertour-primary-border-width': '2px',
  '--usertour-primary-border-color': '#c1c2c3',
  '--usertour-primary-border-hover': '#c4c5c6',
  '--usertour-primary-border-active': '#c7c8c9',
  '--usertour-primary-font-weight': '510',
  '--usertour-secondary': '#d1d2d3',
  '--usertour-secondary-hover': '#d4d5d6',
  '--usertour-secondary-active': '#d7d8d9',
  '--usertour-secondary-foreground': '#e1e2e3',
  '--usertour-secondary-foreground-hover': '#e4e5e6',
  '--usertour-secondary-foreground-active': '#e7e8e9',
  '--usertour-secondary-border-width': '0px',
  '--usertour-secondary-border-color': '#f1f2f3',
  '--usertour-secondary-border-hover': '#f4f5f6',
  '--usertour-secondary-border-active': '#f7f8f9',
  '--usertour-secondary-font-weight': '520',
  '--usertour-backdrop-color-rgb': '51, 102, 153',
  '--usertour-backdrop-highlight-color-rgb': '102, 51, 153',
  '--usertour-backdrop-highlight-opacity': '0.5',
  '--usertour-backdrop-highlight-radius': '4px',
  '--usertour-backdrop-highlight-spread': '2px',
  '--usertour-backdrop-opacity': '0.4',
  '--usertour-focus-color': '120 100% 50% / 0.5',
  '--usertour-progress-bar-color': '#123456',
  '--usertour-progress-bar-height': '2px',
  '--usertour-narrow-progress-bar-height': '5px',
  '--usertour-squared-progress-bar-height': '4px',
  '--usertour-rounded-progress-bar-height': '6px',
  '--usertour-dotted-progress-bar-height': '7px',
  '--usertour-numbered-progress-bar-height': '12px',
  '--usertour-xbutton': '#654321',
  '--usertour-widget-launcher-icon-color': '#101010',
  '--usertour-widget-launcher-icon-hover-color': '#202020',
  '--usertour-widget-launcher-icon-active-color': '#303030',
  '--usertour-widget-launcher-icon-size': '19px',
  '--usertour-widget-beacon-color': '#404040',
  '--usertour-widget-beacon-size': '23px',
  '--usertour-widget-launcher-icon-opacity': '0.8',
  '--usertour-widget-popper-padding-top': '2px',
  '--usertour-widget-popper-padding-bottom': '2px',
  '--usertour-checklist-trigger-active-background-color': '#515253',
  '--usertour-checklist-trigger-background-color': '#545556',
  '--usertour-checklist-trigger-border-radius': '33px',
  '--usertour-checklist-trigger-counter-background-color': '#616263',
  '--usertour-checklist-trigger-counter-font-color': '#646566',
  // Despite the -rgb suffix this variable passes the hex through unconverted.
  // No stylesheet consumes it today (only the badge -rgb variable is used,
  // and that one IS converted); pinned as-is.
  '--usertour-checklist-trigger-font-color-rgb': '#ff0000',
  '--usertour-checklist-trigger-font-color': '0 100% 50%',
  '--usertour-checklist-trigger-font-weight': '530',
  '--usertour-checkmark-background-color': '#717273',
  '--usertour-resource-center-launcher-background-color': '240 100% 50%',
  '--usertour-resource-center-launcher-hover-background-color': '300 100% 50%',
  '--usertour-resource-center-launcher-active-background-color': '180 100% 50%',
  '--usertour-resource-center-launcher-foreground-color': '60 100% 50%',
  '--usertour-resource-center-header-background-color': '180 100% 50%',
  '--usertour-resource-center-launcher-border-radius': '15px',
  '--usertour-resource-center-launcher-font-weight': '640',
  '--usertour-resource-center-launcher-height': '61px',
  '--usertour-resource-center-launcher-icon-size': '29px',
  '--usertour-resource-center-badge-background-color': '#ff0000',
  '--usertour-resource-center-badge-background-color-rgb': '255, 0, 0',
  '--usertour-resource-center-badge-foreground-color': '#818283',
  '--usertour-resource-center-width': '331px',
  '--usertour-resource-center-large-width': '441px',
  '--usertour-resource-center-max-height': '507px',
  '--usertour-resource-center-transition-duration': '222ms',
  '--usertour-banner-foreground-color': '0 100% 50%',
  '--usertour-banner-background-color': '60 100% 50%',
  '--usertour-banner-hover-background-color': '300 100% 50%',
  '--usertour-banner-active-background-color': '180 100% 50%',
  '--usertour-banner-hover-foreground-color': '120 100% 50%',
  '--usertour-banner-active-foreground-color': '240 100% 50%',
  '--usertour-banner-padding': '13px',
  '--usertour-checklist-trigger-height': '57px',
  '--usertour-checklist-trigger-hover-background-color': '#575859',
  '--usertour-question-color': '300 100% 25.1%',
  '--usertour-launcher-button-height': '37px',
  '--usertour-launcher-button-width': '121px',
  '--usertour-launcher-button-horizontal-padding': '18px',
  '--usertour-launcher-button-border-radius': '14px',
  '--usertour-launcher-button-background-color': '#919293',
  '--usertour-launcher-button-hover-background-color': '#949596',
  '--usertour-launcher-button-active-background-color': '#979899',
  '--usertour-launcher-button-font-color': '#a9aaab',
  '--usertour-launcher-button-hover-font-color': '#acadae',
  '--usertour-launcher-button-active-font-color': '#afb0b1',
  '--usertour-launcher-button-font-weight': '540',
  '--usertour-launcher-button-border-width': '4px',
  '--usertour-launcher-button-border-color': '#b9babb',
  '--usertour-launcher-button-hover-border-color': '#bcbdbe',
  '--usertour-launcher-button-active-border-color': '#bfc0c1',
};

describe('convertToCssVars value fidelity', () => {
  it('maps every setting to its exact CSS variable (tooltip)', () => {
    const parsed = parseCssVars(convertToCssVars(resolvedSettings));
    expect(parsed).toEqual(expectedTooltipVars);
  });

  it('modal type adds the popper padding and changes nothing else', () => {
    const parsed = parseCssVars(convertToCssVars(resolvedSettings, 'modal'));
    expect(parsed).toEqual({
      ...expectedTooltipVars,
      '--usertour-widget-popper-padding': '44px',
    });
  });

  it('inside highlight type adds the backdrop inset flag and changes nothing else', () => {
    const settings = structuredClone(resolvedSettings);
    settings.backdrop.highlight.type = 'inside';
    const parsed = parseCssVars(convertToCssVars(settings));
    expect(parsed).toEqual({
      ...expectedTooltipVars,
      '--usertour-backdrop-highlight-inset': 'inset',
    });
  });

  describe('border enable toggles', () => {
    it('disabled popper border collapses to 0px regardless of borderWidth', () => {
      const settings = structuredClone(resolvedSettings);
      settings.border.borderWidthEnabled = false;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-widget-popper-border-width']).toBe('0px');
      // The color variables still carry their configured values.
      expect(parsed['--usertour-widget-popper-border-color']).toBe('#111213');
    });

    it('disabled primary button border collapses to 0px', () => {
      const settings = structuredClone(resolvedSettings);
      settings.buttons.primary.border.enabled = false;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-primary-border-width']).toBe('0px');
    });

    it('enabled secondary button border emits its configured width', () => {
      const settings = structuredClone(resolvedSettings);
      settings.buttons.secondary.border.enabled = true;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-secondary-border-width']).toBe('5px');
    });

    it('disabled launcher button border collapses to 0px', () => {
      const settings = structuredClone(resolvedSettings);
      settings.launcherButtons.primary.border.enabled = false;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-launcher-button-border-width']).toBe('0px');
    });
  });

  describe('launcher button width', () => {
    it.each([[undefined], [0]])('width %p renders as auto', (width) => {
      const settings = structuredClone(resolvedSettings);
      settings.launcherButtons.width = width as any;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-launcher-button-width']).toBe('auto');
    });
  });

  describe('resource center conditionals', () => {
    it('null launcher borderRadius falls back to the half-height calc()', () => {
      const settings = structuredClone(resolvedSettings);
      settings.resourceCenterLauncherButton!.borderRadius = null;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-resource-center-launcher-border-radius']).toBe(
        'calc(var(--usertour-resource-center-launcher-height) / 2)',
      );
    });

    it('missing maxHeight renders as none', () => {
      const settings = structuredClone(resolvedSettings);
      settings.resourceCenter!.maxHeight = undefined;
      const parsed = parseCssVars(convertToCssVars(settings));
      expect(parsed['--usertour-resource-center-max-height']).toBe('none');
    });

    it("header background 'Auto' falls back to mainColor.active", () => {
      const settings = structuredClone(resolvedSettings);
      settings.resourceCenter!.headerBackground.color = 'Auto';
      const parsed = parseCssVars(convertToCssVars(settings));
      // mainColor.active is #00ff00 in the fixture.
      expect(parsed['--usertour-resource-center-header-background-color']).toBe('120 100% 50%');
    });
  });

  it("documents the footgun: unresolved 'Auto' reaching convertToCssVars becomes black", () => {
    // convertToCssVars assumes convertSettings has already resolved every
    // 'Auto'; fed raw, hexToHSLString falls back to 0 0% 0%. This is why the
    // SDK must always run the full convertSettings -> convertToCssVars chain.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const settings = structuredClone(resolvedSettings);
    settings.mainColor.background = 'Auto';
    const parsed = parseCssVars(convertToCssVars(settings));
    expect(parsed['--usertour-background']).toBe('0 0% 0%');
    warn.mockRestore();
  });
});

describe('convertSettings -> convertToCssVars pipeline', () => {
  it('derives banner hover/active states from resolved banner colors', () => {
    // Brand: white background, blue foreground. Banner colors default to
    // 'Auto', so background=#ffffff and text=#155eef; hover/active pairs are
    // the generateStateColors JSDoc example (#e6eefd / #ccdcfc) and its
    // inverse-direction pair (#3d7af2 / #1250cb), here as HSL.
    const resolved = convertSettings({
      brandColor: { background: '#ffffff', color: '#155eef', hover: 'Auto', active: 'Auto' },
    } as ThemeTypesSetting);
    const parsed = parseCssVars(convertToCssVars(resolved));
    expect(parsed['--usertour-banner-background-color']).toBe('0 0% 100%');
    expect(parsed['--usertour-banner-foreground-color']).toBe('219.91 87.2% 50.98%');
    expect(parsed['--usertour-banner-hover-background-color']).toBe('219.13 85.19% 94.71%');
    expect(parsed['--usertour-banner-active-background-color']).toBe('220 88.89% 89.41%');
    expect(parsed['--usertour-banner-hover-foreground-color']).toBe('219.78 87.44% 59.41%');
    expect(parsed['--usertour-banner-active-foreground-color']).toBe('219.89 83.71% 43.33%');
  });

  it('cascades resource-center launcher colors from brand when the RC blocks are absent', () => {
    const resolved = convertSettings({
      brandColor: { background: '#0000ff', color: '#ffff00', hover: 'Auto', active: 'Auto' },
    } as ThemeTypesSetting);
    const parsed = parseCssVars(convertToCssVars(resolved));
    // Launcher background/foreground follow brand background/color.
    expect(parsed['--usertour-resource-center-launcher-background-color']).toBe('240 100% 50%');
    expect(parsed['--usertour-resource-center-launcher-foreground-color']).toBe('60 100% 50%');
    // Hover/active derive via generateStateColors('#0000ff', '#ffff00')
    // = #2a2ad5 / #0000ff (see color.test.ts).
    expect(parsed['--usertour-resource-center-launcher-hover-background-color']).toBe(
      '240 67.06% 50%',
    );
    expect(parsed['--usertour-resource-center-launcher-active-background-color']).toBe(
      '240 100% 50%',
    );
    // Default launcher borderRadius is null -> half-height calc().
    expect(parsed['--usertour-resource-center-launcher-border-radius']).toBe(
      'calc(var(--usertour-resource-center-launcher-height) / 2)',
    );
    // Default header background is 'Auto' -> resolved mainColor.active,
    // i.e. defaultSettings.mainColor.autoActive (#cedcfb).
    expect(defaultSettings.mainColor.autoActive).toBe('#cedcfb');
    expect(parsed['--usertour-resource-center-header-background-color']).toBe(
      '221.33 84.91% 89.61%',
    );
  });

  it('resolves System font to the default stack before mapping', () => {
    const resolved = convertSettings({
      font: { fontFamily: 'System font' },
    } as ThemeTypesSetting);
    const parsed = parseCssVars(convertToCssVars(resolved));
    expect(parsed['--usertour-font-family']).toContain('-apple-system');
    expect(parsed['--usertour-font-family']).toContain('sans-serif');
  });

  it('appends sans-serif to a bare custom font family', () => {
    const resolved = convertSettings({
      font: { fontFamily: 'Inter' },
    } as ThemeTypesSetting);
    const parsed = parseCssVars(convertToCssVars(resolved));
    // convertSettings appends ', sans-serif;' with a stray trailing
    // semicolon; in the emitted css string it just closes the declaration
    // early, so the effective value consumers see is this.
    expect(parsed['--usertour-font-family']).toBe('Inter, sans-serif');
  });
});
