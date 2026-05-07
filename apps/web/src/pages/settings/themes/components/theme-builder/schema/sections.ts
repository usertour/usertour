import {
  AvatarType,
  MissingTooltipTargetBehavior,
  ModalPosition,
  ProgressBarPosition,
  ProgressBarType,
  ThemeDetailPreviewType,
} from '@usertour/types';
import type { BuilderSection, FieldDef } from './types';

// All `label`, option labels, alert messages, etc. are translation keys; the
// FieldRenderer / consuming components resolve them via `t()` at render time.
// Keys live under `themeBuilder.*` in `packages/shared/i18n/src/{en-US,zh-Hans}/ui.ts`.

const FONT_WEIGHT_OPTIONS = [
  { value: '100', label: 'themeBuilder.options.fontWeight.thin' },
  { value: '200', label: 'themeBuilder.options.fontWeight.extraLight' },
  { value: '300', label: 'themeBuilder.options.fontWeight.light' },
  { value: '400', label: 'themeBuilder.options.fontWeight.normal' },
  { value: '500', label: 'themeBuilder.options.fontWeight.medium' },
  { value: '600', label: 'themeBuilder.options.fontWeight.semibold' },
  { value: '700', label: 'themeBuilder.options.fontWeight.bold' },
  { value: '800', label: 'themeBuilder.options.fontWeight.extraBold' },
  { value: '900', label: 'themeBuilder.options.fontWeight.black' },
];

const PLACEMENT_FIVE: { value: string; label: string }[] = [
  { value: ModalPosition.LeftTop, label: 'themeBuilder.options.placementCornerCenter.topLeft' },
  { value: ModalPosition.RightTop, label: 'themeBuilder.options.placementCornerCenter.topRight' },
  {
    value: ModalPosition.LeftBottom,
    label: 'themeBuilder.options.placementCornerCenter.bottomLeft',
  },
  {
    value: ModalPosition.RightBottom,
    label: 'themeBuilder.options.placementCornerCenter.bottomRight',
  },
  { value: ModalPosition.Center, label: 'themeBuilder.options.placementCornerCenter.center' },
];

const RC_PLACEMENT_FOUR: { value: string; label: string }[] = [
  { value: 'top-left', label: 'themeBuilder.options.placementCornerCenter.topLeft' },
  { value: 'top-right', label: 'themeBuilder.options.placementCornerCenter.topRight' },
  { value: 'bottom-left', label: 'themeBuilder.options.placementCornerCenter.bottomLeft' },
  { value: 'bottom-right', label: 'themeBuilder.options.placementCornerCenter.bottomRight' },
];

const ALL_AUTO: [boolean, boolean, boolean] = [true, true, true];

const buttonFields = (name: 'primary' | 'secondary'): FieldDef[] => {
  const prefix = `buttons.${name}`;
  return [
    {
      type: 'select',
      path: `${prefix}.fontWeight`,
      label: 'themeBuilder.fields.common.fontWeight',
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
      labels: [
        'themeBuilder.fields.common.fontColor',
        'themeBuilder.fields.common.hover',
        'themeBuilder.fields.common.click',
      ],
      allowAuto: ALL_AUTO,
    },
    {
      type: 'triple-color',
      paths: [
        `${prefix}.backgroundColor.background`,
        `${prefix}.backgroundColor.hover`,
        `${prefix}.backgroundColor.active`,
      ],
      labels: [
        'themeBuilder.fields.common.background',
        'themeBuilder.fields.common.hover',
        'themeBuilder.fields.common.click',
      ],
      allowAuto: ALL_AUTO,
    },
    {
      type: 'boolean',
      path: `${prefix}.border.enabled`,
      label: 'themeBuilder.fields.common.border',
    },
    {
      type: 'number',
      path: `${prefix}.border.borderWidth`,
      label: 'themeBuilder.fields.common.borderWidth',
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
      labels: [
        'themeBuilder.fields.common.borderColor',
        'themeBuilder.fields.common.hover',
        'themeBuilder.fields.common.click',
      ],
      allowAuto: ALL_AUTO,
      visibleWhen: (s) => s.buttons[name].border.enabled,
    },
  ];
};

export const builderSections: BuilderSection[] = [
  {
    id: 'base-colors',
    label: 'themeBuilder.sections.baseColors',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'sub-section',
        label: 'themeBuilder.subSections.brandColors',
        fields: [
          {
            type: 'color',
            path: 'brandColor.color',
            label: 'themeBuilder.fields.common.text',
            vertical: true,
          },
          {
            type: 'triple-color',
            paths: ['brandColor.background', 'brandColor.hover', 'brandColor.active'],
            labels: [
              'themeBuilder.fields.common.background',
              'themeBuilder.fields.common.hover',
              'themeBuilder.fields.common.click',
            ],
            allowAuto: [false, true, true],
          },
        ],
      },
      {
        type: 'sub-section',
        label: 'themeBuilder.subSections.mainColors',
        withSeparator: true,
        fields: [
          {
            type: 'color',
            path: 'mainColor.color',
            label: 'themeBuilder.fields.common.text',
            vertical: true,
          },
          {
            type: 'triple-color',
            paths: ['mainColor.background', 'mainColor.hover', 'mainColor.active'],
            labels: [
              'themeBuilder.fields.common.background',
              'themeBuilder.fields.common.hover',
              'themeBuilder.fields.common.click',
            ],
            allowAuto: [false, true, true],
          },
        ],
      },
    ],
  },

  {
    id: 'avatar',
    label: 'themeBuilder.sections.avatar',
    previewWidget: ThemeDetailPreviewType.BUBBLE,
    fields: [
      { type: 'avatar-type', basePath: 'avatar' },
      {
        type: 'number',
        path: 'avatar.size',
        label: 'themeBuilder.fields.avatar.avatarSize',
        min: 24,
        max: 120,
        suffix: 'px',
      },
    ],
  },

  {
    id: 'font',
    label: 'themeBuilder.sections.font',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      { type: 'font-family', path: 'font.fontFamily', label: 'themeBuilder.fields.font.family' },
      {
        type: 'number',
        path: 'font.fontSize',
        label: 'themeBuilder.fields.font.bodySize',
        min: 10,
        max: 24,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'font.lineHeight',
        label: 'themeBuilder.fields.font.lineHeight',
        min: 12,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'font.fontWeightNormal',
        label: 'themeBuilder.fields.font.bodyWeight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'select',
        path: 'font.fontWeightBold',
        label: 'themeBuilder.fields.font.boldWeight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'number',
        path: 'font.h1FontSize',
        label: 'themeBuilder.fields.font.h1Size',
        min: 16,
        max: 48,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'font.h2FontSize',
        label: 'themeBuilder.fields.font.h2Size',
        min: 14,
        max: 32,
        suffix: 'px',
      },
      {
        type: 'color',
        path: 'font.linkColor',
        label: 'themeBuilder.fields.font.linkColor',
        allowAuto: true,
      },
    ],
  },

  {
    id: 'chrome-border',
    label: 'themeBuilder.sections.chromeBorder',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'number',
        path: 'border.borderRadius',
        label: 'themeBuilder.fields.common.borderRadius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'boolean',
        path: 'border.borderWidthEnabled',
        label: 'themeBuilder.fields.common.border',
      },
      {
        type: 'number',
        path: 'border.borderWidth',
        label: 'themeBuilder.fields.common.borderWidth',
        min: 0,
        max: 10,
        suffix: 'px',
        visibleWhen: (s) => s.border.borderWidthEnabled,
      },
      {
        type: 'color',
        path: 'border.borderColor',
        label: 'themeBuilder.fields.common.borderColor',
        allowAuto: true,
        visibleWhen: (s) => s.border.borderWidthEnabled,
      },
    ],
  },

  {
    id: 'x-button',
    label: 'themeBuilder.sections.xButton',
    previewWidget: ThemeDetailPreviewType.MODAL,
    fields: [
      {
        type: 'color',
        path: 'xbutton.color',
        label: 'themeBuilder.fields.common.color',
        allowAuto: true,
      },
    ],
  },

  {
    id: 'progress-bar',
    label: 'themeBuilder.sections.progressBar',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'boolean',
        path: 'progress.enabled',
        label: 'themeBuilder.fields.progress.showProgressBar',
      },
      {
        type: 'select',
        path: 'progress.type',
        label: 'themeBuilder.fields.progress.progressBarType',
        vertical: true,
        options: [
          {
            value: ProgressBarType.FULL_WIDTH,
            label: 'themeBuilder.options.progressBarType.fullWidth',
          },
          { value: ProgressBarType.NARROW, label: 'themeBuilder.options.progressBarType.narrow' },
          {
            value: ProgressBarType.CHAIN_ROUNDED,
            label: 'themeBuilder.options.progressBarType.chainRounded',
          },
          {
            value: ProgressBarType.CHAIN_SQUARED,
            label: 'themeBuilder.options.progressBarType.chainSquared',
          },
          { value: ProgressBarType.DOTS, label: 'themeBuilder.options.progressBarType.dots' },
          {
            value: ProgressBarType.NUMBERED,
            label: 'themeBuilder.options.progressBarType.numbered',
          },
        ],
        visibleWhen: (s) => s.progress.enabled,
      },
      {
        type: 'select',
        path: 'progress.position',
        label: 'themeBuilder.fields.progress.progressBarPosition',
        options: [
          { value: ProgressBarPosition.TOP, label: 'themeBuilder.options.progressBarPosition.top' },
          {
            value: ProgressBarPosition.BOTTOM,
            label: 'themeBuilder.options.progressBarPosition.bottom',
          },
        ],
        visibleWhen: (s) => s.progress.enabled && s.progress.type !== ProgressBarType.FULL_WIDTH,
      },
      {
        type: 'color',
        path: 'progress.color',
        label: 'themeBuilder.fields.progress.progressBarColor',
        allowAuto: true,
        visibleWhen: (s) => s.progress.enabled,
      },
      {
        type: 'dynamic-number',
        getLabel: (s) => {
          switch (s.progress.type) {
            case ProgressBarType.CHAIN_ROUNDED:
            case ProgressBarType.CHAIN_SQUARED:
              return 'themeBuilder.fields.progress.chainHeight';
            case ProgressBarType.DOTS:
              return 'themeBuilder.fields.progress.dotSize';
            case ProgressBarType.NUMBERED:
              return 'themeBuilder.fields.progress.fontSize';
            default:
              return 'themeBuilder.fields.progress.progressBarHeight';
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
        message: 'themeBuilder.alerts.progressNonLinear',
        variant: 'warning',
        visibleWhen: (s) =>
          s.progress.enabled &&
          s.progress.type !== ProgressBarType.FULL_WIDTH &&
          s.progress.type !== ProgressBarType.NARROW,
      },
    ],
  },

  {
    id: 'buttons',
    label: 'themeBuilder.sections.buttons',
    previewWidget: ThemeDetailPreviewType.MODAL,
    fields: [
      {
        type: 'number',
        path: 'buttons.height',
        label: 'themeBuilder.fields.common.height',
        min: 24,
        max: 64,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'buttons.minWidth',
        label: 'themeBuilder.fields.buttons.minWidth',
        min: 0,
        max: 200,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'buttons.borderRadius',
        label: 'themeBuilder.fields.common.borderRadius',
        min: 0,
        max: 32,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'buttons.px',
        label: 'themeBuilder.fields.buttons.horizontalPadding',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'sub-section',
        label: 'themeBuilder.subSections.primaryButton',
        withSeparator: true,
        fields: buttonFields('primary'),
      },
      {
        type: 'sub-section',
        label: 'themeBuilder.subSections.secondaryButton',
        withSeparator: true,
        fields: buttonFields('secondary'),
      },
    ],
  },

  {
    id: 'speech-bubble',
    label: 'themeBuilder.sections.speechBubble',
    previewWidget: ThemeDetailPreviewType.BUBBLE,
    fields: [
      {
        type: 'number',
        path: 'bubble.width',
        label: 'themeBuilder.fields.common.width',
        min: 200,
        max: 600,
        suffix: 'px',
      },
      {
        type: 'placement',
        path: 'bubble.placement',
        label: 'themeBuilder.fields.common.placement',
        labels: {
          position: 'themeBuilder.fields.common.placement',
          offsetX: 'themeBuilder.fields.common.offsetLeft',
          offsetY: 'themeBuilder.fields.common.offsetBottom',
        },
      },
    ],
  },

  {
    id: 'tooltip',
    label: 'themeBuilder.sections.tooltip',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'number',
        path: 'tooltip.width',
        label: 'themeBuilder.fields.common.width',
        min: 200,
        max: 600,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'tooltip.notchSize',
        label: 'themeBuilder.fields.tooltip.notchSize',
        min: 0,
        max: 30,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'tooltip.missingTargetTolerance',
        label: 'themeBuilder.fields.tooltip.missingTargetTolerance',
        min: 0,
        max: 10,
        suffix: 's',
        validate: (v) => (v > 10 ? 'themeBuilder.validation.toleranceMax' : undefined),
      },
      {
        type: 'select',
        path: 'tooltip.missingTargetBehavior',
        label: 'themeBuilder.fields.tooltip.missingTargetBehavior',
        vertical: true,
        options: [
          {
            value: MissingTooltipTargetBehavior.AUTO_DISMISS,
            label: 'themeBuilder.options.missingTargetBehavior.autoDismiss',
          },
          {
            value: MissingTooltipTargetBehavior.USE_BUBBLE,
            label: 'themeBuilder.options.missingTargetBehavior.useBubble',
          },
        ],
      },
    ],
  },

  {
    id: 'modal',
    label: 'themeBuilder.sections.modal',
    previewWidget: ThemeDetailPreviewType.MODAL,
    fields: [
      {
        type: 'number',
        path: 'modal.width',
        label: 'themeBuilder.fields.common.width',
        min: 320,
        max: 1200,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'modal.padding',
        label: 'themeBuilder.fields.common.padding',
        min: 0,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'modal.backdropClickBehavior',
        label: 'themeBuilder.fields.modal.backdropClickBehavior',
        vertical: true,
        options: [
          { value: 'do-nothing', label: 'themeBuilder.options.modalBackdropClick.doNothing' },
          { value: 'dismiss-flow', label: 'themeBuilder.options.modalBackdropClick.dismissFlow' },
        ],
      },
    ],
  },

  {
    id: 'survey',
    label: 'themeBuilder.sections.survey',
    previewWidget: ThemeDetailPreviewType.NPS,
    fields: [
      {
        type: 'color',
        path: 'survey.color',
        label: 'themeBuilder.fields.common.color',
        allowAuto: true,
      },
    ],
  },

  {
    id: 'banner',
    label: 'themeBuilder.sections.banner',
    previewWidget: ThemeDetailPreviewType.BANNER,
    fields: [
      {
        type: 'color',
        path: 'banner.backgroundColor.background',
        label: 'themeBuilder.fields.banner.backgroundColor',
        allowAuto: true,
      },
      {
        type: 'color',
        path: 'banner.textColor.color',
        label: 'themeBuilder.fields.banner.textColor',
        allowAuto: true,
      },
      {
        type: 'number',
        path: 'banner.padding',
        label: 'themeBuilder.fields.common.padding',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'banner.animationDuration',
        label: 'themeBuilder.fields.banner.animationDuration',
        min: 0,
        max: 1000,
        suffix: 'ms',
      },
      {
        type: 'select',
        path: 'banner.animationTiming',
        label: 'themeBuilder.fields.banner.animationStyle',
        options: [
          { value: 'smooth', label: 'themeBuilder.options.bannerAnimation.smooth' },
          { value: 'snappy', label: 'themeBuilder.options.bannerAnimation.snappy' },
          { value: 'gentle', label: 'themeBuilder.options.bannerAnimation.gentle' },
          { value: 'linear', label: 'themeBuilder.options.bannerAnimation.linear' },
        ],
      },
    ],
  },

  {
    id: 'checklist',
    label: 'themeBuilder.sections.checklist',
    previewWidget: ThemeDetailPreviewType.CHECKLIST,
    fields: [
      {
        type: 'number',
        path: 'checklist.width',
        label: 'themeBuilder.fields.common.width',
        min: 240,
        max: 600,
        suffix: 'px',
      },
      {
        type: 'placement',
        path: 'checklist.placement',
        label: 'themeBuilder.fields.common.placement',
        options: PLACEMENT_FIVE,
        labels: {
          position: 'themeBuilder.fields.common.placement',
          offsetX: 'themeBuilder.fields.common.offsetRight',
          offsetY: 'themeBuilder.fields.common.offsetBottom',
        },
      },
      {
        type: 'number',
        path: 'checklist.zIndex',
        label: 'themeBuilder.fields.common.zIndex',
        optional: true,
        placeholder: 'themeBuilder.placeholders.auto',
      },
      {
        type: 'color',
        path: 'checklist.checkmarkColor',
        label: 'themeBuilder.fields.checklist.checkmarkColor',
        allowAuto: true,
      },
      {
        type: 'select',
        path: 'checklist.completedTaskTextDecoration',
        label: 'themeBuilder.fields.checklist.completedTaskTextDecoration',
        vertical: true,
        options: [
          { value: 'none', label: 'themeBuilder.options.textDecoration.none' },
          { value: 'line-through', label: 'themeBuilder.options.textDecoration.lineThrough' },
        ],
      },
    ],
  },

  {
    id: 'checklist-launcher',
    label: 'themeBuilder.sections.checklistLauncher',
    previewWidget: ThemeDetailPreviewType.CHECKLIST_LAUNCHER,
    fields: [
      {
        type: 'number',
        path: 'checklistLauncher.height',
        label: 'themeBuilder.fields.common.height',
        min: 32,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'checklistLauncher.borderRadius',
        label: 'themeBuilder.fields.common.borderRadius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'checklistLauncher.fontWeight',
        label: 'themeBuilder.fields.common.fontWeight',
        options: FONT_WEIGHT_OPTIONS,
        valueAsNumber: true,
      },
      {
        type: 'placement',
        path: 'checklistLauncher.placement',
        label: 'themeBuilder.fields.common.placement',
        options: PLACEMENT_FIVE,
        labels: {
          position: 'themeBuilder.fields.common.placement',
          offsetX: 'themeBuilder.fields.common.offsetRight',
          offsetY: 'themeBuilder.fields.common.offsetBottom',
        },
      },
      {
        type: 'color',
        path: 'checklistLauncher.color.color',
        label: 'themeBuilder.fields.common.fontColor',
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
        labels: [
          'themeBuilder.fields.common.background',
          'themeBuilder.fields.common.hover',
          'themeBuilder.fields.common.active',
        ],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'color',
        path: 'checklistLauncher.counter.color',
        label: 'themeBuilder.fields.checklistLauncher.counterFontColor',
        allowAuto: true,
        vertical: true,
      },
      {
        type: 'color',
        path: 'checklistLauncher.counter.background',
        label: 'themeBuilder.fields.checklistLauncher.counterBackgroundColor',
        allowAuto: true,
        vertical: true,
      },
    ],
  },

  {
    id: 'resource-center',
    label: 'themeBuilder.sections.resourceCenter',
    previewWidget: ThemeDetailPreviewType.RESOURCE_CENTER,
    fields: [
      {
        type: 'sub-section',
        label: 'themeBuilder.subSections.homeHeaderBackground',
        fields: [
          {
            type: 'select',
            path: 'resourceCenter.headerBackground.type',
            label: 'themeBuilder.fields.resourceCenter.type',
            options: [
              { value: 'none', label: 'themeBuilder.options.headerBackgroundType.none' },
              { value: 'color', label: 'themeBuilder.options.headerBackgroundType.color' },
              { value: 'gradient', label: 'themeBuilder.options.headerBackgroundType.gradient' },
              { value: 'image', label: 'themeBuilder.options.headerBackgroundType.image' },
            ],
          },
          {
            type: 'color',
            path: 'resourceCenter.headerBackground.color',
            label: 'themeBuilder.fields.resourceCenter.backgroundColor',
            allowAuto: true,
            autoFallback: (s) =>
              s.mainColor.active === 'Auto'
                ? ((s.mainColor.autoActive as string) ?? s.mainColor.background)
                : s.mainColor.active,
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'color',
          },
          {
            type: 'color',
            path: 'resourceCenter.headerBackground.gradientFrom',
            label: 'themeBuilder.fields.resourceCenter.gradientFrom',
            allowAuto: true,
            autoFallback: (s) => s.brandColor.background,
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'gradient',
          },
          {
            type: 'color',
            path: 'resourceCenter.headerBackground.gradientTo',
            label: 'themeBuilder.fields.resourceCenter.gradientTo',
            allowAuto: true,
            autoFallback: (s) => s.brandColor.color,
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'gradient',
          },
          {
            type: 'image-upload',
            path: 'resourceCenter.headerBackground.imageUrl',
            label: 'themeBuilder.subSections.uploadBackgroundImage',
            description: 'themeBuilder.descriptions.pngJpgSvg',
            visibleWhen: (s) => s.resourceCenter?.headerBackground.type === 'image',
          },
        ],
      },
      {
        type: 'sub-section',
        label: 'themeBuilder.subSections.logo',
        visibleWhen: (s) =>
          s.resourceCenter?.headerBackground.type !== 'none' &&
          s.resourceCenter?.headerBackground.type != null,
        fields: [
          {
            type: 'image-upload',
            path: 'resourceCenter.logoUrl',
            label: '',
            description: 'themeBuilder.descriptions.logoSpec',
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
            label: 'themeBuilder.fields.common.placement',
            options: RC_PLACEMENT_FOUR,
          },
          {
            type: 'number',
            path: 'resourceCenter.offsetX',
            label: 'themeBuilder.fields.common.offsetX',
            min: 0,
            max: 200,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.offsetY',
            label: 'themeBuilder.fields.common.offsetY',
            min: 0,
            max: 200,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.normalWidth',
            label: 'themeBuilder.fields.resourceCenter.normalWidth',
            min: 240,
            max: 600,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.largeWidth',
            label: 'themeBuilder.fields.resourceCenter.largeWidth',
            min: 320,
            max: 800,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.maxHeight',
            label: 'themeBuilder.fields.resourceCenter.maxHeight',
            min: 200,
            max: 1200,
            suffix: 'px',
          },
          {
            type: 'number',
            path: 'resourceCenter.transitionDuration',
            label: 'themeBuilder.fields.resourceCenter.transitionDuration',
            min: 0,
            max: 1000,
            suffix: 'ms',
          },
          {
            type: 'number',
            path: 'resourceCenter.zIndex',
            label: 'themeBuilder.fields.common.zIndex',
            optional: true,
            placeholder: 'themeBuilder.placeholders.auto',
          },
        ],
      },
    ],
  },

  {
    id: 'resource-center-launcher',
    label: 'themeBuilder.sections.resourceCenterLauncher',
    previewWidget: ThemeDetailPreviewType.RESOURCE_CENTER_LAUNCHER,
    fields: [
      {
        type: 'select',
        path: 'resourceCenterLauncherButton.iconType',
        label: 'themeBuilder.fields.resourceCenterLauncher.iconType',
        vertical: true,
        options: [
          {
            value: 'default-question-mark',
            label: 'themeBuilder.options.iconType.defaultQuestionMark',
          },
          {
            value: 'plaintext-question-mark',
            label: 'themeBuilder.options.iconType.plaintextQuestionMark',
          },
          { value: 'custom', label: 'themeBuilder.options.iconType.custom' },
        ],
      },
      {
        type: 'image-upload',
        path: 'resourceCenterLauncherButton.iconUrl',
        label: 'themeBuilder.subSections.customIcon',
        description: 'themeBuilder.descriptions.customIconSpec',
        visibleWhen: (s) => s.resourceCenterLauncherButton?.iconType === 'custom',
      },
      {
        type: 'number',
        path: 'resourceCenterLauncherButton.height',
        label: 'themeBuilder.fields.common.height',
        min: 24,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'resourceCenterLauncherButton.imageHeight',
        label: 'themeBuilder.fields.resourceCenterLauncher.imageHeight',
        min: 16,
        max: 80,
        suffix: 'px',
        visibleWhen: (s) => s.resourceCenterLauncherButton?.iconType === 'custom',
      },
      {
        type: 'number',
        path: 'resourceCenterLauncherButton.borderRadius',
        label: 'themeBuilder.fields.common.borderRadius',
        min: 0,
        max: 40,
        suffix: 'px',
        optional: true,
        placeholder: 'themeBuilder.placeholders.round',
      },
      {
        type: 'select',
        path: 'resourceCenterLauncherButton.textMode',
        label: 'themeBuilder.fields.resourceCenterLauncher.textMode',
        vertical: true,
        options: [
          {
            value: 'resource-center-text',
            label: 'themeBuilder.options.textMode.resourceCenterText',
          },
          { value: 'no-text', label: 'themeBuilder.options.textMode.noText' },
        ],
      },
      {
        type: 'triple-color',
        paths: [
          'resourceCenterLauncherButton.color.background',
          'resourceCenterLauncherButton.color.hover',
          'resourceCenterLauncherButton.color.active',
        ],
        labels: [
          'themeBuilder.fields.common.background',
          'themeBuilder.fields.common.hover',
          'themeBuilder.fields.common.active',
        ],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'color',
        path: 'resourceCenterLauncherButton.color.foreground',
        label: 'themeBuilder.fields.common.fontColor',
        allowAuto: true,
        vertical: true,
      },
    ],
  },

  {
    id: 'launcher-beacons',
    label: 'themeBuilder.sections.launcherBeacons',
    previewWidget: ThemeDetailPreviewType.LAUNCHER_BEACON,
    fields: [
      {
        type: 'color',
        path: 'launcherBeacon.color',
        label: 'themeBuilder.fields.common.color',
        allowAuto: true,
      },
      {
        type: 'number',
        path: 'launcherBeacon.size',
        label: 'themeBuilder.fields.common.size',
        min: 8,
        max: 32,
        suffix: 'px',
      },
    ],
  },

  {
    id: 'launcher-icons',
    label: 'themeBuilder.sections.launcherIcons',
    previewWidget: ThemeDetailPreviewType.LAUNCHER_ICON,
    fields: [
      {
        type: 'number',
        path: 'launcherIcon.size',
        label: 'themeBuilder.fields.common.size',
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
        labels: [
          'themeBuilder.fields.common.color',
          'themeBuilder.fields.common.hover',
          'themeBuilder.fields.common.click',
        ],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'slider',
        path: 'launcherIcon.opacity',
        label: 'themeBuilder.fields.common.opacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
    ],
  },

  {
    id: 'launcher-buttons',
    label: 'themeBuilder.sections.launcherButtons',
    previewWidget: ThemeDetailPreviewType.LAUNCHER_BUTTON,
    fields: [
      {
        type: 'number',
        path: 'launcherButtons.height',
        label: 'themeBuilder.fields.common.height',
        min: 24,
        max: 80,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'launcherButtons.width',
        label: 'themeBuilder.fields.common.width',
        min: 0,
        max: 400,
        suffix: 'px',
        optional: true,
        placeholder: 'themeBuilder.placeholders.auto',
        validate: (v) => (v === 0 ? 'themeBuilder.validation.widthZero' : undefined),
      },
      {
        type: 'number',
        path: 'launcherButtons.borderRadius',
        label: 'themeBuilder.fields.common.borderRadius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'launcherButtons.px',
        label: 'themeBuilder.fields.buttons.horizontalPadding',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'select',
        path: 'launcherButtons.primary.fontWeight',
        label: 'themeBuilder.fields.common.fontWeight',
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
        labels: [
          'themeBuilder.fields.common.fontColor',
          'themeBuilder.fields.common.hover',
          'themeBuilder.fields.common.click',
        ],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'triple-color',
        paths: [
          'launcherButtons.primary.backgroundColor.background',
          'launcherButtons.primary.backgroundColor.hover',
          'launcherButtons.primary.backgroundColor.active',
        ],
        labels: [
          'themeBuilder.fields.common.background',
          'themeBuilder.fields.common.hover',
          'themeBuilder.fields.common.click',
        ],
        allowAuto: ALL_AUTO,
      },
      {
        type: 'boolean',
        path: 'launcherButtons.primary.border.enabled',
        label: 'themeBuilder.fields.common.border',
      },
      {
        type: 'number',
        path: 'launcherButtons.primary.border.borderWidth',
        label: 'themeBuilder.fields.common.borderWidth',
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
        labels: [
          'themeBuilder.fields.common.borderColor',
          'themeBuilder.fields.common.hover',
          'themeBuilder.fields.common.click',
        ],
        allowAuto: ALL_AUTO,
        visibleWhen: (s) => s.launcherButtons.primary.border.enabled,
      },
    ],
  },

  {
    id: 'backdrop',
    label: 'themeBuilder.sections.backdrop',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'color',
        path: 'backdrop.color',
        label: 'themeBuilder.fields.backdrop.backdropColor',
      },
      {
        type: 'slider',
        path: 'backdrop.opacity',
        label: 'themeBuilder.fields.backdrop.backdropOpacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
      {
        type: 'select',
        path: 'backdrop.highlight.type',
        label: 'themeBuilder.fields.backdrop.highlightType',
        options: [
          { value: 'outside', label: 'themeBuilder.options.highlightType.outside' },
          { value: 'inside', label: 'themeBuilder.options.highlightType.inside' },
        ],
      },
      {
        type: 'number',
        path: 'backdrop.highlight.radius',
        label: 'themeBuilder.fields.backdrop.highlightRadius',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'number',
        path: 'backdrop.highlight.spread',
        label: 'themeBuilder.fields.backdrop.highlightSpread',
        min: 0,
        max: 40,
        suffix: 'px',
      },
      {
        type: 'color',
        path: 'backdrop.highlight.color',
        label: 'themeBuilder.fields.backdrop.highlightColor',
      },
      {
        type: 'slider',
        path: 'backdrop.highlight.opacity',
        label: 'themeBuilder.fields.backdrop.highlightOpacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
    ],
  },

  {
    id: 'focus-highlight',
    label: 'themeBuilder.sections.focusHighlight',
    previewWidget: ThemeDetailPreviewType.TOOLTIP,
    fields: [
      {
        type: 'color',
        path: 'focusHighlight.color',
        label: 'themeBuilder.fields.common.color',
        allowAuto: true,
      },
      {
        type: 'slider',
        path: 'focusHighlight.opacity',
        label: 'themeBuilder.fields.common.opacity',
        min: 0,
        max: 100,
        suffix: '%',
      },
    ],
  },
];

export const _avatarTypeRef = AvatarType;
