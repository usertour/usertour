/**
 * Theme settings validation constraints — the neutral, presentation-free single
 * source of truth for what a valid theme setting is and its bounds. Both the
 * theme builder (form-control bounds) and the server (write-validation zod)
 * derive from THIS, so neither owns the contract and they cannot drift.
 *
 * Scope: declarative STYLE values only. Media-asset fields (avatars, header image,
 * logo, custom launcher icon) are managed in the theme builder, not here. UI
 * concerns (labels, tooltips, widget choice, visibleWhen) also stay in the builder;
 * for enums the allowed *values* live here, their display *labels* in the builder.
 */
export type ThemeSettingConstraint = (
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'color'; allowAuto: boolean }
  | { kind: 'enum'; values: readonly (string | number)[] }
  | { kind: 'boolean' }
  | { kind: 'string' }
) & {
  /**
   * Unit / applicability note surfaced verbatim in the public API schema
   * (OpenAPI + MCP get_theme_schema). Only for keys whose meaning is not
   * evident from name + bounds — units (seconds vs ms, 0-100 percent),
   * per-type applicability, override precedence.
   */
  describe?: string;
};

export const THEME_SETTING_CONSTRAINTS = {
  'announcement.bubbleWidth': { kind: 'number', min: 100, max: 1000 },
  'announcement.modalWidth': { kind: 'number', min: 100, max: 1000 },
  'avatar.size': { kind: 'number', min: 10, max: 200 },
  'backdrop.color': { kind: 'color', allowAuto: false },
  'backdrop.highlight.color': { kind: 'color', allowAuto: false },
  'backdrop.highlight.opacity': {
    kind: 'number',
    min: 0,
    max: 100,
    describe: 'Percent, 0-100 (not 0-1).',
  },
  'backdrop.highlight.radius': { kind: 'number', min: 0, max: 100 },
  'backdrop.highlight.spread': { kind: 'number', min: 0, max: 100 },
  'backdrop.highlight.type': { kind: 'enum', values: ['outside', 'inside'] },
  'backdrop.opacity': { kind: 'number', min: 0, max: 100, describe: 'Percent, 0-100 (not 0-1).' },
  'banner.animationDuration': {
    kind: 'number',
    min: 0,
    max: 10000,
    describe: 'Milliseconds.',
  },
  'banner.animationTiming': { kind: 'enum', values: ['smooth', 'snappy', 'gentle', 'linear'] },
  'banner.backgroundColor.background': { kind: 'color', allowAuto: true },
  'banner.padding': { kind: 'number', min: 0, max: 100 },
  'banner.textColor.color': { kind: 'color', allowAuto: true },
  'border.borderColor': { kind: 'color', allowAuto: true },
  'border.borderRadius': { kind: 'number', min: 0 },
  'border.borderWidth': { kind: 'number', min: 0, max: 50 },
  'border.borderWidthEnabled': { kind: 'boolean' },
  'brandColor.active': { kind: 'color', allowAuto: true },
  'brandColor.background': { kind: 'color', allowAuto: false },
  'brandColor.color': { kind: 'color', allowAuto: false },
  'brandColor.hover': { kind: 'color', allowAuto: true },
  'bubble.placement.position': {
    kind: 'enum',
    values: [
      'leftTop',
      'centerTop',
      'rightTop',
      'leftBottom',
      'centerBottom',
      'rightBottom',
      'center',
    ],
  },
  'bubble.placement.positionOffsetX': { kind: 'number', min: -1000, max: 1000 },
  'bubble.placement.positionOffsetY': { kind: 'number', min: -1000, max: 1000 },
  'bubble.width': { kind: 'number', min: 100, max: 1000 },
  'buttons.borderRadius': { kind: 'number', min: 0, max: 100 },
  'buttons.height': { kind: 'number', min: 1, max: 100 },
  'buttons.minWidth': { kind: 'number', min: 0, max: 500 },
  'buttons.primary.backgroundColor.active': { kind: 'color', allowAuto: true },
  'buttons.primary.backgroundColor.background': { kind: 'color', allowAuto: true },
  'buttons.primary.backgroundColor.hover': { kind: 'color', allowAuto: true },
  'buttons.primary.border.borderWidth': { kind: 'number', min: 0, max: 20 },
  'buttons.primary.border.color.active': { kind: 'color', allowAuto: true },
  'buttons.primary.border.color.color': { kind: 'color', allowAuto: true },
  'buttons.primary.border.color.hover': { kind: 'color', allowAuto: true },
  'buttons.primary.border.enabled': { kind: 'boolean' },
  'buttons.primary.fontWeight': {
    kind: 'enum',
    values: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  'buttons.primary.textColor.active': { kind: 'color', allowAuto: true },
  'buttons.primary.textColor.color': { kind: 'color', allowAuto: true },
  'buttons.primary.textColor.hover': { kind: 'color', allowAuto: true },
  'buttons.px': { kind: 'number', min: 0, max: 100 },
  'buttons.secondary.backgroundColor.active': { kind: 'color', allowAuto: true },
  'buttons.secondary.backgroundColor.background': { kind: 'color', allowAuto: true },
  'buttons.secondary.backgroundColor.hover': { kind: 'color', allowAuto: true },
  'buttons.secondary.border.borderWidth': { kind: 'number', min: 0, max: 20 },
  'buttons.secondary.border.color.active': { kind: 'color', allowAuto: true },
  'buttons.secondary.border.color.color': { kind: 'color', allowAuto: true },
  'buttons.secondary.border.color.hover': { kind: 'color', allowAuto: true },
  'buttons.secondary.border.enabled': { kind: 'boolean' },
  'buttons.secondary.fontWeight': {
    kind: 'enum',
    values: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  'buttons.secondary.textColor.active': { kind: 'color', allowAuto: true },
  'buttons.secondary.textColor.color': { kind: 'color', allowAuto: true },
  'buttons.secondary.textColor.hover': { kind: 'color', allowAuto: true },
  'checklist.checkmarkColor': { kind: 'color', allowAuto: true },
  'checklist.completedTaskTextDecoration': { kind: 'enum', values: ['none', 'line-through'] },
  'checklist.placement.position': {
    kind: 'enum',
    values: ['leftTop', 'rightTop', 'leftBottom', 'rightBottom', 'center'],
  },
  'checklist.placement.positionOffsetX': { kind: 'number', min: 0, max: 1000 },
  'checklist.placement.positionOffsetY': { kind: 'number', min: 0, max: 1000 },
  'checklist.width': { kind: 'number', min: 100, max: 1000 },
  'checklist.zIndex': { kind: 'number' },
  'checklistLauncher.borderRadius': { kind: 'number', min: 0, max: 100 },
  'checklistLauncher.color.active': { kind: 'color', allowAuto: true },
  'checklistLauncher.color.background': { kind: 'color', allowAuto: true },
  'checklistLauncher.color.color': { kind: 'color', allowAuto: true },
  'checklistLauncher.color.hover': { kind: 'color', allowAuto: true },
  'checklistLauncher.counter.background': { kind: 'color', allowAuto: true },
  'checklistLauncher.counter.color': { kind: 'color', allowAuto: true },
  'checklistLauncher.fontWeight': {
    kind: 'enum',
    values: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  'checklistLauncher.height': { kind: 'number', min: 10, max: 200 },
  'checklistLauncher.placement.position': {
    kind: 'enum',
    values: ['leftTop', 'rightTop', 'leftBottom', 'rightBottom', 'center'],
  },
  'checklistLauncher.placement.positionOffsetX': { kind: 'number', min: 0, max: 1000 },
  'checklistLauncher.placement.positionOffsetY': { kind: 'number', min: 0, max: 1000 },
  customCss: { kind: 'string' },
  'focusHighlight.color': { kind: 'color', allowAuto: true },
  'focusHighlight.opacity': {
    kind: 'number',
    min: 0,
    max: 100,
    describe: 'Percent, 0-100 (not 0-1).',
  },
  'font.customFontFamily': {
    kind: 'string',
    describe:
      'Font family name used when font.fontFamily is "Custom font" (declare the face itself ' +
      'via customCss @font-face). When set this way it OVERRIDES font.fontFamily at render.',
  },
  'font.fontFamily': { kind: 'string' },
  'font.fontSize': { kind: 'number', min: 10, max: 50 },
  'font.fontWeightBold': { kind: 'enum', values: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  'font.fontWeightNormal': { kind: 'enum', values: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  'font.h1FontSize': { kind: 'number', min: 10, max: 100 },
  'font.h2FontSize': { kind: 'number', min: 10, max: 100 },
  'font.lineHeight': { kind: 'number', min: 10, max: 50 },
  'font.linkColor': { kind: 'color', allowAuto: true },
  'launcherBeacon.color': { kind: 'color', allowAuto: true },
  'launcherBeacon.size': { kind: 'number', min: 1, max: 100 },
  'launcherButtons.borderRadius': { kind: 'number', min: 0, max: 100 },
  'launcherButtons.height': { kind: 'number', min: 1, max: 200 },
  'launcherButtons.primary.backgroundColor.active': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.backgroundColor.background': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.backgroundColor.hover': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.border.borderWidth': { kind: 'number', min: 0, max: 100 },
  'launcherButtons.primary.border.color.active': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.border.color.color': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.border.color.hover': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.border.enabled': { kind: 'boolean' },
  'launcherButtons.primary.fontWeight': {
    kind: 'enum',
    values: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  'launcherButtons.primary.textColor.active': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.textColor.color': { kind: 'color', allowAuto: true },
  'launcherButtons.primary.textColor.hover': { kind: 'color', allowAuto: true },
  'launcherButtons.px': { kind: 'number', min: 0, max: 100 },
  'launcherButtons.width': { kind: 'number', min: 1, max: 200 },
  'launcherIcon.color.active': { kind: 'color', allowAuto: true },
  'launcherIcon.color.color': { kind: 'color', allowAuto: true },
  'launcherIcon.color.hover': { kind: 'color', allowAuto: true },
  'launcherIcon.opacity': {
    kind: 'number',
    min: 0,
    max: 100,
    describe: 'Percent, 0-100 (not 0-1).',
  },
  'launcherIcon.size': { kind: 'number', min: 1, max: 200 },
  'mainColor.active': { kind: 'color', allowAuto: true },
  'mainColor.background': { kind: 'color', allowAuto: false },
  'mainColor.color': { kind: 'color', allowAuto: false },
  'mainColor.hover': { kind: 'color', allowAuto: true },
  'modal.backdropClickBehavior': { kind: 'enum', values: ['do-nothing', 'dismiss-flow'] },
  'modal.padding': { kind: 'number', min: 0, max: 100 },
  'modal.width': { kind: 'number', min: 100, max: 1000 },
  'progress.chainRoundedHeight': {
    kind: 'number',
    min: 1,
    max: 10,
    describe: 'Pixels. Applies ONLY when progress.type is "chain-rounded".',
  },
  'progress.chainSquaredHeight': {
    kind: 'number',
    min: 1,
    max: 10,
    describe: 'Pixels. Applies ONLY when progress.type is "chain-squared".',
  },
  'progress.color': { kind: 'color', allowAuto: true },
  'progress.dotsHeight': {
    kind: 'number',
    min: 1,
    max: 10,
    describe: 'Pixels. Applies ONLY when progress.type is "dots".',
  },
  'progress.enabled': { kind: 'boolean' },
  'progress.height': {
    kind: 'number',
    min: 0,
    max: 10,
    describe:
      'Pixels. Applies ONLY when progress.type is "full-width" — each progress type reads its own height key.',
  },
  'progress.narrowHeight': {
    kind: 'number',
    min: 1,
    max: 10,
    describe: 'Pixels. Applies ONLY when progress.type is "narrow".',
  },
  'progress.numberedHeight': {
    kind: 'number',
    min: 1,
    max: 100,
    describe: 'Pixels. Applies ONLY when progress.type is "numbered".',
  },
  'progress.position': { kind: 'enum', values: ['top', 'bottom'] },
  'progress.type': {
    kind: 'enum',
    values: ['full-width', 'narrow', 'chain-rounded', 'chain-squared', 'dots', 'numbered'],
  },
  'resourceCenter.headerBackground.color': { kind: 'color', allowAuto: true },
  'resourceCenter.headerBackground.gradientFrom': { kind: 'color', allowAuto: true },
  'resourceCenter.headerBackground.gradientTo': { kind: 'color', allowAuto: true },
  'resourceCenter.headerBackground.type': {
    kind: 'enum',
    values: ['none', 'color', 'gradient', 'image'],
  },
  'resourceCenter.largeWidth': { kind: 'number', min: 100, max: 2000 },
  'resourceCenter.maxHeight': { kind: 'number', min: 100, max: 2000 },
  'resourceCenter.normalWidth': { kind: 'number', min: 100, max: 1000 },
  'resourceCenter.offsetX': { kind: 'number', min: 0, max: 1000 },
  'resourceCenter.offsetY': { kind: 'number', min: 0, max: 1000 },
  'resourceCenter.placement': {
    kind: 'enum',
    values: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  },
  'resourceCenter.transitionDuration': {
    kind: 'number',
    min: 0,
    max: 10000,
    describe: 'Milliseconds.',
  },
  'resourceCenter.zIndex': { kind: 'number' },
  'resourceCenterLauncherButton.borderRadius': { kind: 'number', min: 0, max: 100 },
  'resourceCenterUnreadBadge.backgroundColor': { kind: 'color', allowAuto: false },
  'resourceCenterUnreadBadge.textColor': { kind: 'color', allowAuto: false },
  'resourceCenterLauncherButton.color.active': { kind: 'color', allowAuto: true },
  'resourceCenterLauncherButton.color.background': { kind: 'color', allowAuto: true },
  'resourceCenterLauncherButton.color.foreground': { kind: 'color', allowAuto: true },
  'resourceCenterLauncherButton.color.hover': { kind: 'color', allowAuto: true },
  'resourceCenterLauncherButton.height': { kind: 'number', min: 10, max: 200 },
  'resourceCenterLauncherButton.iconType': {
    kind: 'enum',
    values: ['default-question-mark', 'plaintext-question-mark', 'custom'],
  },
  'resourceCenterLauncherButton.imageHeight': { kind: 'number', min: 10, max: 200 },
  'resourceCenterLauncherButton.textMode': {
    kind: 'enum',
    values: ['resource-center-text', 'no-text'],
  },
  'survey.color': { kind: 'color', allowAuto: true },
  'tooltip.missingTargetBehavior': { kind: 'enum', values: ['auto-dismiss', 'use-bubble'] },
  'tooltip.missingTargetTolerance': {
    kind: 'number',
    min: 0,
    max: 10,
    describe:
      'SECONDS to keep looking for a missing tooltip target before missingTargetBehavior kicks ' +
      'in. A runtime SDK missing-target setting, when configured, takes precedence over this.',
  },
  'tooltip.notchSize': { kind: 'number', min: 5, max: 100 },
  'tooltip.width': { kind: 'number', min: 100, max: 1000 },
  'xbutton.color': { kind: 'color', allowAuto: true },
} as const satisfies Record<string, ThemeSettingConstraint>;

export type ThemeSettingPath = keyof typeof THEME_SETTING_CONSTRAINTS;
