import {
  AvatarType,
  MissingTooltipTargetBehavior,
  ModalPosition,
  ProgressBarPosition,
  ProgressBarType,
  ThemeDetailPreviewType,
} from '@usertour/types';
import type { BuilderSection, FieldDef } from './types';

const FONT_WEIGHT_OPTIONS = [
  { value: '100', label: 'Thin 100' },
  { value: '200', label: 'Extra light 200' },
  { value: '300', label: 'Light 300' },
  { value: '400', label: 'Normal 400' },
  { value: '500', label: 'Medium 500' },
  { value: '600', label: 'Semibold 600' },
  { value: '700', label: 'Bold 700' },
  { value: '800', label: 'Extra bold 800' },
  { value: '900', label: 'Black 900' },
];

const PLACEMENT_FIVE: { value: string; label: string }[] = [
  { value: ModalPosition.LeftTop, label: 'Top Left' },
  { value: ModalPosition.RightTop, label: 'Top Right' },
  { value: ModalPosition.LeftBottom, label: 'Bottom Left' },
  { value: ModalPosition.RightBottom, label: 'Bottom Right' },
  { value: ModalPosition.Center, label: 'Center' },
];

const RC_PLACEMENT_FOUR: { value: string; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const ALL_AUTO: [boolean, boolean, boolean] = [true, true, true];

// Builds the per-button block (primary or secondary) used inside the Buttons
// section. Mirrors v1 ThemeSettingsButton's hierarchy: font-weight select →
// font color triple → background triple → border switch (+ width when on) →
// border color triple (when on). Cascade rules in use-theme-draft handle the
// auto* derivation for textColor / backgroundColor / border.color.
const buttonFields = (name: 'primary' | 'secondary'): FieldDef[] => {
  const prefix = `buttons.${name}`;
  return [
    {
      type: 'select',
      path: `${prefix}.fontWeight`,
      label: 'Font weight',
      options: FONT_WEIGHT_OPTIONS,
      valueAsNumber: true,
    },
    {
      type: 'triple-color',
      paths: [
        `${prefix}.textColor.color`,
        `${prefix}.textColor.hover`,
        `${prefix}.textColor.active`,
      ],
      labels: ['Font color', 'Hover', 'Click'],
      allowAuto: ALL_AUTO,
    },
    {
      type: 'triple-color',
      paths: [
        `${prefix}.backgroundColor.background`,
        `${prefix}.backgroundColor.hover`,
        `${prefix}.backgroundColor.active`,
      ],
      labels: ['Background', 'Hover', 'Click'],
      allowAuto: ALL_AUTO,
    },
    { type: 'boolean', path: `${prefix}.border.enabled`, label: 'Border' },
    {
      type: 'number',
      path: `${prefix}.border.borderWidth`,
      label: 'Border width',
      min: 0,
      max: 10,
      suffix: 'px',
      visibleWhen: (s) => s.buttons[name].border.enabled,
    },
    {
      type: 'triple-color',
      paths: [
        `${prefix}.border.color.color`,
        `${prefix}.border.color.hover`,
        `${prefix}.border.color.active`,
      ],
      labels: ['Border color', 'Hover', 'Click'],
      allowAuto: ALL_AUTO,
      visibleWhen: (s) => s.buttons[name].border.enabled,
    },
  ];
};

export const builderSections: BuilderSection[] = [
  // -------------------------------------------------------------------------
  // Base colors
  // -------------------------------------------------------------------------
  {
    id: 'base-colors',
    label: 'Base colors',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'sub-section',
        label: 'Brand colors',
        fields: [
          { type: 'color', path: 'brandColor.color', label: 'Text', vertical: true },
          {
            type: 'triple-color',
            paths: ['brandColor.background', 'brandColor.hover', 'brandColor.active'],
            labels: ['Background', 'Hover', 'Click'],
            allowAuto: [false, true, true],
          },
        ],
      },
      {
        type: 'sub-section',
        label: 'Main colors',
        withSeparator: true,
        fields: [
          { type: 'color', path: 'mainColor.color', label: 'Text', vertical: true },
          {
            type: 'triple-color',
            paths: ['mainColor.background', 'mainColor.hover', 'mainColor.active'],
            labels: ['Background', 'Hover', 'Click'],
            allowAuto: [false, true, true],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Avatar
  // -------------------------------------------------------------------------
  {
    id: 'avatar',
    label: 'Avatar',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'avatar-type', basePath: 'avatar' },
      {
        type: 'number',
        path: 'avatar.size',
        label: 'Avatar size',
        min: 24,
        max: 120,
        suffix: 'px',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Font
  // -------------------------------------------------------------------------
  {
    id: 'font',
    label: 'Font',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'font-family', path: 'font.fontFamily', label: 'Font family' },
      {
        type: 'number',
        path: 'font.fontSize',
        label: 'Body size',
        min: 10,
        max: 24,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'font.lineHeight',
        label: 'Line height',
        min: 12,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'font.fontWeightNormal',
        label: 'Body weight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'select',
        path: 'font.fontWeightBold',
        label: 'Bold weight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'number',
        path: 'font.h1FontSize',
        label: 'H1 size',
        min: 16,
        max: 48,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'font.h2FontSize',
        label: 'H2 size',
        min: 14,
        max: 32,
        suffix: 'px',
      },
      { type: 'color', path: 'font.linkColor', label: 'Link color', allowAuto: true },
    ],
  },

  // -------------------------------------------------------------------------
  // Chrome border
  // -------------------------------------------------------------------------
  {
    id: 'chrome-border',
    label: 'Chrome border',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'number',
        path: 'border.borderRadius',
        label: 'Border radius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      { type: 'boolean', path: 'border.borderWidthEnabled', label: 'Border' },
      {
        type: 'number',
        path: 'border.borderWidth',
        label: 'Border width',
        min: 0,
        max: 10,
        suffix: 'px',
        visibleWhen: (s) => s.border.borderWidthEnabled,
      },
      {
        type: 'color',
        path: 'border.borderColor',
        label: 'Border color',
        allowAuto: true,
        visibleWhen: (s) => s.border.borderWidthEnabled,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // X button
  // -------------------------------------------------------------------------
  {
    id: 'x-button',
    label: 'X Button',
    previewWidget: ThemeDetailPreviewType.MODAL,
    fields: [{ type: 'color', path: 'xbutton.color', label: 'Color', allowAuto: true }],
  },

  // -------------------------------------------------------------------------
  // Progress bar
  // -------------------------------------------------------------------------
  {
    id: 'progress-bar',
    label: 'Progress bar',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'boolean', path: 'progress.enabled', label: 'Show progress bar' },
      {
        type: 'select',
        path: 'progress.type',
        label: 'Progress bar type',
        vertical: true,
        options: [
          { value: ProgressBarType.FULL_WIDTH, label: 'Full width progress bar' },
          { value: ProgressBarType.NARROW, label: 'Narrow progress bar' },
          { value: ProgressBarType.CHAIN_ROUNDED, label: 'Chain rounded' },
          { value: ProgressBarType.CHAIN_SQUARED, label: 'Chain squared' },
          { value: ProgressBarType.DOTS, label: 'Dots' },
          { value: ProgressBarType.NUMBERED, label: 'Numbered (1 of 3)' },
        ],
        visibleWhen: (s) => s.progress.enabled,
      },
      {
        type: 'select',
        path: 'progress.position',
        label: 'Progress bar position',
        options: [
          { value: ProgressBarPosition.TOP, label: 'Top' },
          { value: ProgressBarPosition.BOTTOM, label: 'Bottom' },
        ],
        visibleWhen: (s) => s.progress.enabled && s.progress.type !== ProgressBarType.FULL_WIDTH,
      },
      {
        type: 'color',
        path: 'progress.color',
        label: 'Progress bar color',
        allowAuto: true,
        visibleWhen: (s) => s.progress.enabled,
      },
      {
        type: 'dynamic-number',
        getLabel: (s) => {
          switch (s.progress.type) {
            case ProgressBarType.CHAIN_ROUNDED:
            case ProgressBarType.CHAIN_SQUARED:
              return 'Chain height';
            case ProgressBarType.DOTS:
              return 'Dot size';
            case ProgressBarType.NUMBERED:
              return 'Font size';
            default:
              return 'Progress bar height';
          }
        },
        getPath: (s) => {
          switch (s.progress.type) {
            case ProgressBarType.NARROW:
              return 'progress.narrowHeight';
            case ProgressBarType.CHAIN_ROUNDED:
              return 'progress.chainRoundedHeight';
            case ProgressBarType.CHAIN_SQUARED:
              return 'progress.chainSquaredHeight';
            case ProgressBarType.DOTS:
              return 'progress.dotsHeight';
            case ProgressBarType.NUMBERED:
              return 'progress.numberedHeight';
            default:
              return 'progress.height';
          }
        },
        allPaths: [
          'progress.height',
          'progress.narrowHeight',
          'progress.chainRoundedHeight',
          'progress.chainSquaredHeight',
          'progress.dotsHeight',
          'progress.numberedHeight',
        ],
        min: 1,
        max: 50,
        suffix: 'px',
        visibleWhen: (s) => s.progress.enabled,
      },
      {
        type: 'inline-alert',
        message:
          'Progress bar may not work correctly with non-linear flows that have conditional steps or branching paths.',
        variant: 'warning',
        visibleWhen: (s) =>
          s.progress.enabled &&
          s.progress.type !== ProgressBarType.FULL_WIDTH &&
          s.progress.type !== ProgressBarType.NARROW,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Buttons (Primary + Secondary, with cascades)
  // -------------------------------------------------------------------------
  {
    id: 'buttons',
    label: 'Buttons',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'number', path: 'buttons.height', label: 'Height', min: 24, max: 64, suffix: 'px' },
      {
        type: 'number',
        path: 'buttons.minWidth',
        label: 'Min width',
        min: 0,
        max: 200,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'buttons.borderRadius',
        label: 'Border radius',
        min: 0,
        max: 32,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'buttons.px',
        label: 'Horizontal padding',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'sub-section',
        label: 'Primary button',
        withSeparator: true,
        fields: buttonFields('primary'),
      },
      {
        type: 'sub-section',
        label: 'Secondary button',
        withSeparator: true,
        fields: buttonFields('secondary'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Speech bubble
  // -------------------------------------------------------------------------
  {
    id: 'speech-bubble',
    label: 'Speech bubble',
    previewWidget: ThemeDetailPreviewType.BUBBLE,
    fields: [
      { type: 'number', path: 'bubble.width', label: 'Width', min: 200, max: 600, suffix: 'px' },
      {
        type: 'placement',
        path: 'bubble.placement',
        label: 'Placement',
        labels: { position: 'Placement', offsetX: 'Offset left', offsetY: 'Offset bottom' },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Tooltip
  // -------------------------------------------------------------------------
  {
    id: 'tooltip',
    label: 'Tooltip',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'number', path: 'tooltip.width', label: 'Width', min: 200, max: 600, suffix: 'px' },
      {
        type: 'number',
        path: 'tooltip.notchSize',
        label: 'Notch size',
        min: 0,
        max: 30,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'tooltip.missingTargetTolerance',
        label: 'Missing tooltip target tolerance',
        min: 0,
        max: 10,
        suffix: 's',
        validate: (v) => (v > 10 ? 'Maximum value is 10' : undefined),
      },
      {
        type: 'select',
        path: 'tooltip.missingTargetBehavior',
        label: 'Missing tooltip target behavior',
        vertical: true,
        options: [
          { value: MissingTooltipTargetBehavior.AUTO_DISMISS, label: 'Auto dismiss' },
          { value: MissingTooltipTargetBehavior.USE_BUBBLE, label: 'Use bubble' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Modal
  // -------------------------------------------------------------------------
  {
    id: 'modal',
    label: 'Modal',
    previewWidget: ThemeDetailPreviewType.MODAL,
    fields: [
      { type: 'number', path: 'modal.width', label: 'Width', min: 320, max: 1200, suffix: 'px' },
      { type: 'number', path: 'modal.padding', label: 'Padding', min: 0, max: 80, suffix: 'px' },
      {
        type: 'select',
        path: 'modal.backdropClickBehavior',
        label: 'Modal backdrop click behavior',
        vertical: true,
        options: [
          { value: 'do-nothing', label: 'Do nothing' },
          { value: 'dismiss-flow', label: 'Dismiss flow' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Survey
  // -------------------------------------------------------------------------
  {
    id: 'survey',
    label: 'Survey',
    previewWidget: ThemeDetailPreviewType.NPS,
    fields: [{ type: 'color', path: 'survey.color', label: 'Color', allowAuto: true }],
  },

  // -------------------------------------------------------------------------
  // Banner
  // -------------------------------------------------------------------------
  {
    id: 'banner',
    label: 'Banner',
    previewWidget: ThemeDetailPreviewType.BANNER,
    fields: [
      {
        type: 'color',
        path: 'banner.backgroundColor.background',
        label: 'Background color',
        allowAuto: true,
      },
      { type: 'color', path: 'banner.textColor.color', label: 'Text color', allowAuto: true },
      { type: 'number', path: 'banner.padding', label: 'Padding', min: 0, max: 40, suffix: 'px' },
      {
        type: 'number',
        path: 'banner.animationDuration',
        label: 'Animation duration',
        min: 0,
        max: 1000,
        suffix: 'ms',
      },
      {
        type: 'select',
        path: 'banner.animationTiming',
        label: 'Animation style',
        options: [
          { value: 'smooth', label: 'Smooth' },
          { value: 'snappy', label: 'Snappy' },
          { value: 'gentle', label: 'Gentle' },
          { value: 'linear', label: 'Linear' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Checklist
  // -------------------------------------------------------------------------
  {
    id: 'checklist',
    label: 'Checklist',
    previewWidget: ThemeDetailPreviewType.CHECKLIST,
    fields: [
      {
        type: 'number',
        path: 'checklist.width',
        label: 'Width',
        min: 240,
        max: 600,
        suffix: 'px',
      },
      {
        type: 'placement',
        path: 'checklist.placement',
        label: 'Placement',
        options: PLACEMENT_FIVE,
        labels: { position: 'Placement', offsetX: 'Offset right', offsetY: 'Offset bottom' },
      },
      {
        type: 'number',
        path: 'checklist.zIndex',
        label: 'Z-index',
        optional: true,
        placeholder: 'Auto',
      },
      {
        type: 'color',
        path: 'checklist.checkmarkColor',
        label: 'Checkmark color',
        allowAuto: true,
      },
      {
        type: 'select',
        path: 'checklist.completedTaskTextDecoration',
        label: 'Completed task text decoration',
        vertical: true,
        options: [
          { value: 'none', label: 'None (no line-through)' },
          { value: 'line-through', label: 'Line-through' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Checklist launcher
  // -------------------------------------------------------------------------
  {
    id: 'checklist-launcher',
    label: 'Checklist launcher',
    previewWidget: ThemeDetailPreviewType.CHECKLIST_LAUNCHER,
    fields: [
      {
        type: 'number',
        path: 'checklistLauncher.height',
        label: 'Height',
        min: 32,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'checklistLauncher.borderRadius',
        label: 'Border radius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'checklistLauncher.fontWeight',
        label: 'Font weight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'placement',
        path: 'checklistLauncher.placement',
        label: 'Placement',
        options: PLACEMENT_FIVE,
        labels: { position: 'Placement', offsetX: 'Offset right', offsetY: 'Offset bottom' },
      },
      {
        type: 'color',
        path: 'checklistLauncher.color.color',
        label: 'Font color',
        allowAuto: true,
        vertical: true,
      },
      {
        type: 'triple-color',
        paths: [
          'checklistLauncher.color.background',
          'checklistLauncher.color.hover',
          'checklistLauncher.color.active',
        ],
        labels: ['Background', 'Hover', 'Active'],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'color',
        path: 'checklistLauncher.counter.color',
        label: 'Counter font color',
        allowAuto: true,
        vertical: true,
      },
      {
        type: 'color',
        path: 'checklistLauncher.counter.background',
        label: 'Counter background color',
        allowAuto: true,
        vertical: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Resource center
  // -------------------------------------------------------------------------
  {
    id: 'resource-center',
    label: 'Resource center',
    previewWidget: ThemeDetailPreviewType.RESOURCE_CENTER,
    fields: [
      {
        type: 'sub-section',
        label: 'Home header background',
        fields: [
          {
            type: 'select',
            path: 'resourceCenter.headerBackground.type',
            label: 'Type',
            options: [
              { value: 'none', label: 'None' },
              { value: 'color', label: 'Color' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'image', label: 'Image' },
            ],
          },
          {
            type: 'color',
            path: 'resourceCenter.headerBackground.color',
            label: 'Background color',
            allowAuto: true,
            // v1: autoColor = mainColor.active resolved (autoActive when active is 'Auto').
            autoFallback: (s) =>
              s.mainColor.active === 'Auto'
                ? ((s.mainColor.autoActive as string) ?? s.mainColor.background)
                : s.mainColor.active,
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'color',
          },
          {
            type: 'color',
            path: 'resourceCenter.headerBackground.gradientFrom',
            label: 'Gradient from',
            allowAuto: true,
            autoFallback: (s) => s.brandColor.background,
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'gradient',
          },
          {
            type: 'color',
            path: 'resourceCenter.headerBackground.gradientTo',
            label: 'Gradient to',
            allowAuto: true,
            autoFallback: (s) => s.brandColor.color,
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'gradient',
          },
          {
            type: 'image-upload',
            path: 'resourceCenter.headerBackground.imageUrl',
            label: 'Upload background image',
            description: 'PNG/JPG/SVG',
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'image',
          },
        ],
      },
      {
        type: 'sub-section',
        label: 'Logo',
        visibleWhen: (s) =>
          s.resourceCenter?.headerBackground.type !== 'none' &&
          s.resourceCenter?.headerBackground.type != null,
        fields: [
          {
            type: 'image-upload',
            path: 'resourceCenter.logoUrl',
            label: '',
            description: 'Recommended size: 60x60 pixels. Max file size: 2MB.',
            maxSizeBytes: 2 * 1024 * 1024,
            previewAspect: 'wide',
          },
        ],
      },
      {
        type: 'sub-section',
        withSeparator: true,
        fields: [
          {
            type: 'select',
            path: 'resourceCenter.placement',
            label: 'Placement',
            options: RC_PLACEMENT_FOUR,
          },
          {
            type: 'number',
            path: 'resourceCenter.offsetX',
            label: 'Offset X',
            min: 0,
            max: 200,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.offsetY',
            label: 'Offset Y',
            min: 0,
            max: 200,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.normalWidth',
            label: 'Normal width',
            min: 240,
            max: 600,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.largeWidth',
            label: 'Large width',
            min: 320,
            max: 800,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.maxHeight',
            label: 'Max height',
            min: 200,
            max: 1200,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.transitionDuration',
            label: 'Transition duration',
            min: 0,
            max: 1000,
            suffix: 'ms',
          },
          {
            type: 'number',
            path: 'resourceCenter.zIndex',
            label: 'Z-index',
            optional: true,
            placeholder: 'Auto',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Resource center launcher
  // -------------------------------------------------------------------------
  {
    id: 'resource-center-launcher',
    label: 'Resource center launcher',
    previewWidget: ThemeDetailPreviewType.RESOURCE_CENTER_LAUNCHER,
    fields: [
      {
        type: 'select',
        path: 'resourceCenterLauncherButton.iconType',
        label: 'Icon type',
        vertical: true,
        options: [
          { value: 'default-question-mark', label: 'Default question mark' },
          { value: 'plaintext-question-mark', label: 'Plaintext question mark' },
          { value: 'custom', label: 'Custom' },
        ],
      },
      {
        type: 'image-upload',
        path: 'resourceCenterLauncherButton.iconUrl',
        label: 'Custom icon',
        description: 'Recommended at least 60x60 pixels. PNG/JPG/SVG.',
        visibleWhen: (s) => s.resourceCenterLauncherButton?.iconType === 'custom',
      },
      {
        type: 'number',
        path: 'resourceCenterLauncherButton.height',
        label: 'Height',
        min: 24,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'resourceCenterLauncherButton.imageHeight',
        label: 'Image height',
        min: 16,
        max: 80,
        suffix: 'px',
        visibleWhen: (s) => s.resourceCenterLauncherButton?.iconType === 'custom',
      },
      {
        type: 'number',
        path: 'resourceCenterLauncherButton.borderRadius',
        label: 'Border radius',
        min: 0,
        max: 40,
        suffix: 'px',
        optional: true,
        placeholder: 'Round',
      },
      {
        type: 'select',
        path: 'resourceCenterLauncherButton.textMode',
        label: 'Text mode',
        vertical: true,
        options: [
          { value: 'resource-center-text', label: 'Resource center text' },
          { value: 'no-text', label: 'No text' },
        ],
      },
      {
        type: 'triple-color',
        paths: [
          'resourceCenterLauncherButton.color.background',
          'resourceCenterLauncherButton.color.hover',
          'resourceCenterLauncherButton.color.active',
        ],
        labels: ['Background', 'Hover', 'Active'],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'color',
        path: 'resourceCenterLauncherButton.color.foreground',
        label: 'Font color',
        allowAuto: true,
        vertical: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Launcher beacons
  // -------------------------------------------------------------------------
  {
    id: 'launcher-beacons',
    label: 'Launcher beacons',
    previewWidget: ThemeDetailPreviewType.LAUNCHER_BEACON,
    fields: [
      { type: 'color', path: 'launcherBeacon.color', label: 'Color', allowAuto: true },
      {
        type: 'number',
        path: 'launcherBeacon.size',
        label: 'Size',
        min: 8,
        max: 32,
        suffix: 'px',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Launcher icons
  // -------------------------------------------------------------------------
  {
    id: 'launcher-icons',
    label: 'Launcher icons',
    previewWidget: ThemeDetailPreviewType.LAUNCHER_ICON,
    fields: [
      {
        type: 'number',
        path: 'launcherIcon.size',
        label: 'Size',
        min: 8,
        max: 64,
        suffix: 'px',
      },
      {
        type: 'triple-color',
        paths: [
          'launcherIcon.color.color',
          'launcherIcon.color.hover',
          'launcherIcon.color.active',
        ],
        labels: ['Color', 'Hover', 'Click'],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'slider',
        path: 'launcherIcon.opacity',
        label: 'Opacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Launcher buttons (single primary, no cascade — matches v1 behavior)
  // -------------------------------------------------------------------------
  {
    id: 'launcher-buttons',
    label: 'Launcher buttons',
    previewWidget: ThemeDetailPreviewType.LAUNCHER_BUTTON,
    fields: [
      {
        type: 'number',
        path: 'launcherButtons.height',
        label: 'Height',
        min: 24,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'launcherButtons.width',
        label: 'Width',
        min: 0,
        max: 400,
        suffix: 'px',
        optional: true,
        placeholder: 'Auto',
        // v1 forbids width === 0; empty input writes undefined (Auto), but a
        // literal 0 would render a 0-wide button.
        validate: (v) => (v === 0 ? 'Width cannot be 0' : undefined),
      },
      {
        type: 'number',
        path: 'launcherButtons.borderRadius',
        label: 'Border radius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'launcherButtons.px',
        label: 'Horizontal padding',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'launcherButtons.primary.fontWeight',
        label: 'Font weight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'triple-color',
        paths: [
          'launcherButtons.primary.textColor.color',
          'launcherButtons.primary.textColor.hover',
          'launcherButtons.primary.textColor.active',
        ],
        labels: ['Font color', 'Hover', 'Click'],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'triple-color',
        paths: [
          'launcherButtons.primary.backgroundColor.background',
          'launcherButtons.primary.backgroundColor.hover',
          'launcherButtons.primary.backgroundColor.active',
        ],
        labels: ['Background', 'Hover', 'Click'],
        allowAuto: ALL_AUTO,
      },
      { type: 'boolean', path: 'launcherButtons.primary.border.enabled', label: 'Border' },
      {
        type: 'number',
        path: 'launcherButtons.primary.border.borderWidth',
        label: 'Border width',
        min: 0,
        max: 10,
        suffix: 'px',
        visibleWhen: (s) => s.launcherButtons.primary.border.enabled,
      },
      {
        type: 'triple-color',
        paths: [
          'launcherButtons.primary.border.color.color',
          'launcherButtons.primary.border.color.hover',
          'launcherButtons.primary.border.color.active',
        ],
        labels: ['Border color', 'Hover', 'Click'],
        allowAuto: ALL_AUTO,
        visibleWhen: (s) => s.launcherButtons.primary.border.enabled,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Backdrop
  // -------------------------------------------------------------------------
  {
    id: 'backdrop',
    label: 'Backdrop',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'color', path: 'backdrop.color', label: 'Backdrop color' },
      {
        type: 'slider',
        path: 'backdrop.opacity',
        label: 'Backdrop opacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
      {
        type: 'select',
        path: 'backdrop.highlight.type',
        label: 'Highlight type',
        options: [
          { value: 'outside', label: 'Outside' },
          { value: 'inside', label: 'Inside' },
        ],
      },
      {
        type: 'number',
        path: 'backdrop.highlight.radius',
        label: 'Highlight radius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'backdrop.highlight.spread',
        label: 'Highlight spread',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      { type: 'color', path: 'backdrop.highlight.color', label: 'Highlight color' },
      {
        type: 'slider',
        path: 'backdrop.highlight.opacity',
        label: 'Highlight opacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Focus highlight
  // -------------------------------------------------------------------------
  {
    id: 'focus-highlight',
    label: 'Focus highlight',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'color', path: 'focusHighlight.color', label: 'Color', allowAuto: true },
      {
        type: 'slider',
        path: 'focusHighlight.opacity',
        label: 'Opacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
    ],
  },
];

// `AvatarType` is exported from @usertour/types but TypeScript drops the
// import if it's only used for a value comparison inside a closure. Keep a
// reference here so coverage tests / future schema closures can use it.
export const _avatarTypeRef = AvatarType;
