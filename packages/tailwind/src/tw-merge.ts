import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Custom tailwind-merge configuration that recognizes SDK custom classes
 * This ensures proper class conflict resolution when using cn()
 */
/**
 * SDK custom color names from extend.ts
 * These are registered in theme.colors so tailwind-merge recognizes them
 * for ALL color utilities: text-*, bg-*, border-*, ring-*, fill-*, stroke-*, etc.
 */
const sdkColors = [
  // Base colors
  'sdk-border',
  'sdk-input',
  'sdk-ring',
  'sdk-link',
  'sdk-xbutton',
  'sdk-background',
  'sdk-foreground',
  'sdk-hover',
  'sdk-active',
  'sdk-destructive',
  'sdk-destructive-foreground',
  'sdk-destructive-hover',
  'sdk-muted',
  'sdk-muted-foreground',
  'sdk-accent',
  'sdk-accent-foreground',
  'sdk-popover',
  'sdk-popover-foreground',
  'sdk-card',
  'sdk-card-foreground',
  'sdk-progress',
  'sdk-question',
  // Brand colors
  'sdk-brand-hover',
  'sdk-brand-active',
  // Checklist colors
  'sdk-checklist-trigger-background',
  'sdk-checklist-trigger-active-background',
  'sdk-checklist-trigger-counter-background',
  'sdk-checklist-trigger-counter-font',
  'sdk-checklist-trigger-font',
  'sdk-checklist-trigger-hover-background',
  'sdk-checklist-checkmark',
  // Button primary colors
  'sdk-btn-primary',
  'sdk-btn-primary-hover',
  'sdk-btn-primary-active',
  'sdk-btn-primary-foreground',
  'sdk-btn-primary-foreground-hover',
  'sdk-btn-primary-foreground-active',
  // Button secondary colors
  'sdk-btn-secondary',
  'sdk-btn-secondary-hover',
  'sdk-btn-secondary-active',
  'sdk-btn-secondary-foreground',
  'sdk-btn-secondary-foreground-hover',
  'sdk-btn-secondary-foreground-active',
];

/**
 * SDK custom font size values (without text- prefix)
 * These extend the font-size class group
 */
const sdkFontSizes = ['sdk-base', 'sdk-h1', 'sdk-h2', 'sdk-xs', 'sdk-numbered-progress'];

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // minWidth group - matches min-w-* classes
      'min-w': ['min-w-sdk-button'],

      // height group - matches h-* classes
      h: [
        'h-sdk-line-height',
        'h-sdk-button',
        'h-sdk-progress',
        'h-sdk-narrow-progress',
        'h-sdk-squared-progress',
        'h-sdk-rounded-progress',
        'h-sdk-dotted-progress',
      ],

      // width group - matches w-* classes
      w: ['w-sdk-rounded-progress', 'w-sdk-squared-progress', 'w-sdk-dotted-progress'],

      // borderRadius group - matches rounded-* classes
      rounded: [
        'rounded-sdk-checklist-trigger',
        'rounded-sdk-lg',
        'rounded-sdk-md',
        'rounded-sdk-sm',
        'rounded-sdk-popper',
        'rounded-sdk-button',
      ],

      // fontSize group - text-sdk-base, text-sdk-xs are font sizes
      'font-size': [{ text: sdkFontSizes }],

      // textColor group - text-sdk-progress, text-sdk-background are colors
      // Must explicitly add to prevent conflict with font-size
      'text-color': [{ text: sdkColors }],

      // bgColor group - bg-sdk-* are background colors
      'bg-color': [{ bg: sdkColors }],

      // borderColor group - border-sdk-* are border colors
      'border-color': [{ border: sdkColors }],

      // ringColor group - ring-sdk-* are ring colors
      'ring-color': [{ ring: sdkColors }],

      // fill group - fill-sdk-* for SVG fill
      fill: [{ fill: sdkColors }],

      // stroke group - stroke-sdk-* for SVG stroke
      stroke: [{ stroke: sdkColors }],

      // fontWeight group - matches font-* classes for font weight
      'font-weight': [
        'font-sdk-normal',
        'font-sdk-bold',
        'font-sdk-primary',
        'font-sdk-secondary',
        'font-sdk-checklist-trigger',
      ],

      // fontFamily group - matches font-* classes for font family
      'font-family': ['font-sdk'],

      // lineHeight group - matches leading-* classes
      // Use object syntax { leading: [...] } to properly extend
      leading: [{ leading: ['sdk-base'] }],

      // padding group - matches p-*, px-*, py-* classes
      px: ['px-sdk-button-x'],

      // borderWidth group - matches border-* classes for width
      // Note: sdk-btn-primary and sdk-btn-secondary are also in sdkColors,
      // so they are treated as border colors, not border widths.
      // This is intentional as they serve dual purpose (color + width).
      'border-w': [
        {
          border: ['sdk-btn-primary', 'sdk-btn-secondary'],
        },
      ],
    },
  },
});

/**
 * Utility function to merge Tailwind CSS classes with proper conflict resolution
 * Handles both standard Tailwind classes and custom SDK classes
 *
 * @param inputs - Class values to merge (strings, arrays, objects)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * cn('min-w-sdk-button', 'min-w-0') // Returns 'min-w-0'
 * cn('text-sdk-base', 'text-lg') // Returns 'text-lg'
 */
export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
