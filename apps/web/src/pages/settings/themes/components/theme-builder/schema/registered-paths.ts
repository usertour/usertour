import { builderSections } from './sections';
import type { FieldDef } from './types';

const expandFieldPaths = (field: FieldDef): string[] => {
  switch (field.type) {
    case 'group-header':
    case 'separator':
    case 'inline-alert':
      return [];
    case 'placement':
      return [
        `${field.path}.position`,
        `${field.path}.positionOffsetX`,
        `${field.path}.positionOffsetY`,
      ];
    case 'avatar-type':
      return [`${field.basePath}.type`, `${field.basePath}.name`, `${field.basePath}.url`];
    case 'sub-section':
      return field.fields.flatMap(expandFieldPaths);
    case 'triple-color':
      return [...field.paths];
    case 'dynamic-number':
      return [...field.allPaths];
    case 'color':
    case 'number':
    case 'slider':
    case 'boolean':
    case 'select':
    case 'text':
    case 'textarea':
    case 'font-family':
    case 'image-upload':
      return [field.path];
  }
};

// Every leaf path the new builder UI can write to. The schema-snapshot test
// asserts this set ∪ DERIVED_PATHS is a superset of the canonical
// ThemeTypesSetting paths, so any field unreachable from the UI fails the
// build.
export const BUILDER_REGISTERED_PATHS: readonly string[] = [
  ...new Set(builderSections.flatMap((section) => section.fields.flatMap(expandFieldPaths))),
].sort();

// Paths the builder writes to automatically via the useThemeDraft cascade
// rules (autoHover/autoActive computed from background + foreground for base
// colors and primary/secondary buttons). Listed here so the coverage test
// treats them as reachable even though they are not directly exposed as form
// fields.
export const DERIVED_PATHS: readonly string[] = [
  // Base colors
  'brandColor.autoHover',
  'brandColor.autoActive',
  'mainColor.autoHover',
  'mainColor.autoActive',
  // Primary button
  'buttons.primary.textColor.autoHover',
  'buttons.primary.textColor.autoActive',
  'buttons.primary.backgroundColor.autoHover',
  'buttons.primary.backgroundColor.autoActive',
  'buttons.primary.border.color.autoHover',
  'buttons.primary.border.color.autoActive',
  // Secondary button
  'buttons.secondary.textColor.autoHover',
  'buttons.secondary.textColor.autoActive',
  'buttons.secondary.backgroundColor.autoHover',
  'buttons.secondary.backgroundColor.autoActive',
  'buttons.secondary.border.color.autoHover',
  'buttons.secondary.border.color.autoActive',
  // Launcher button primary (no cascade in v1, but data model has these
  // fields and convertSettings reads them, so they must exist).
  'launcherButtons.primary.textColor.autoHover',
  'launcherButtons.primary.textColor.autoActive',
  'launcherButtons.primary.backgroundColor.autoHover',
  'launcherButtons.primary.backgroundColor.autoActive',
  'launcherButtons.primary.border.color.autoHover',
  'launcherButtons.primary.border.color.autoActive',
  // Banner: only background.background and text.color are user-editable; the
  // remaining color slots are computed by `convertSettings` via
  // generateStateColors and never surface as form fields.
  'banner.backgroundColor.color',
  'banner.backgroundColor.hover',
  'banner.backgroundColor.active',
  'banner.textColor.background',
  'banner.textColor.hover',
  'banner.textColor.active',
];

// Vestigial fields that exist on the canonical type but v1 never exposed (and
// the SDK doesn't read either). Listed so the coverage test passes; do not
// treat as features. Removing the type fields would be a separate cleanup.
export const VESTIGIAL_PATHS: readonly string[] = [
  // Button color slots that exist in the data shape but are unused — v1 only
  // sets `.color`/`.background` (depending on which slot) and the three
  // states, never the orthogonal slot.
  'buttons.primary.textColor.background',
  'buttons.primary.backgroundColor.color',
  'buttons.primary.border.color.background',
  'buttons.secondary.textColor.background',
  'buttons.secondary.backgroundColor.color',
  'buttons.secondary.border.color.background',
  'launcherButtons.primary.textColor.background',
  'launcherButtons.primary.backgroundColor.color',
  'launcherButtons.primary.border.color.background',
  'launcherIcon.color.background',
  // resourceCenter.dividerLines — present on the type, never wired in v1.
  'resourceCenter.dividerLines',
];
