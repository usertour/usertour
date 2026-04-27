import type { ThemeDetailPreviewType, ThemeTypesSetting } from '@usertour/types';

// `(s) => boolean` for conditional visibility. Receives the active settings
// (base or active variation), so rules like `s.progress.enabled` work.
export type Predicate = (settings: ThemeTypesSetting) => boolean;

// `(s) => string | undefined` for resolving the Auto fallback color shown
// when a user picks "Auto" on a color picker. Mirrors v1's `autoColor=` prop.
export type ColorResolver = (settings: ThemeTypesSetting) => string | undefined;

interface FieldBase {
  visibleWhen?: Predicate;
  tooltip?: string;
}

export type FieldDef =
  | (FieldBase & {
      type: 'color';
      path: string;
      label: string;
      // Show the Auto button. The displayed Auto color resolves via
      // `convertSettings(activeSettings)[path]` unless `autoFallback` overrides.
      allowAuto?: boolean;
      autoFallback?: ColorResolver;
      // Force vertical layout (label on top). When omitted, falls back to
      // FieldRow's auto-by-length rule.
      vertical?: boolean;
    })
  | (FieldBase & {
      type: 'number';
      path: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      suffix?: string;
      // When true, an empty input writes `undefined` (Auto). Used for fields
      // like z-index / launcher button width.
      optional?: boolean;
      placeholder?: string;
      // Returns an error message to surface inline; `undefined` means valid.
      validate?: (value: number) => string | undefined;
    })
  | (FieldBase & {
      type: 'slider';
      path: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      suffix?: string;
    })
  | (FieldBase & {
      type: 'boolean';
      path: string;
      label: string;
    })
  | (FieldBase & {
      type: 'select';
      path: string;
      label: string;
      options: { value: string; label: string }[];
      vertical?: boolean;
      // When true, the underlying setting is stored as a number; the field
      // converts string ↔ number on read/write. Used for font-weight selects.
      valueAsNumber?: boolean;
    })
  | (FieldBase & {
      type: 'text';
      path: string;
      label: string;
      placeholder?: string;
    })
  | (FieldBase & {
      type: 'placement';
      path: string;
      label: string;
      // Custom placement options (e.g., checklist launcher uses only 5
      // positions while bubble/tooltip use 7). Defaults to all 7.
      options?: { value: string; label: string }[];
      labels?: { position?: string; offsetX?: string; offsetY?: string };
    })
  | (FieldBase & {
      type: 'font-family';
      path: string;
      label: string;
    })
  | { type: 'group-header'; label: string }
  // NEW: visual horizontal rule between blocks of fields.
  | { type: 'separator' }
  // NEW: dynamic field whose label and storage path both depend on another
  // field's value (e.g., progress.height vs progress.chainRoundedHeight).
  | (FieldBase & {
      type: 'dynamic-number';
      getLabel: (settings: ThemeTypesSetting) => string;
      getPath: (settings: ThemeTypesSetting) => string;
      // Static enumeration of every path this field can write to. Used by
      // the coverage test to verify schema reachability.
      allPaths: string[];
      min?: number;
      max?: number;
      step?: number;
      suffix?: string;
    })
  // NEW: three color pickers visually joined into one row (default | hover |
  // active). Mirrors v1's basis-1/3 + rounded-r-none/border-x-0/rounded-l-none
  // pattern.
  | (FieldBase & {
      type: 'triple-color';
      paths: [string, string, string];
      labels: [string, string, string];
      // Whether each cell can show the Auto button. Auto color resolves via
      // `convertSettings(activeSettings)[paths[i]]` for each cell.
      allowAuto?: [boolean, boolean, boolean];
    })
  // NEW: visual sub-section with an optional Separator above and an h4 title.
  // Used for "Primary button" / "Secondary button" / "Brand colors" etc.
  // When `label` is omitted, no h4 renders — just the separator and fields.
  | {
      type: 'sub-section';
      label?: string;
      fields: FieldDef[];
      withSeparator?: boolean;
      visibleWhen?: Predicate;
    }
  // NEW: conditional inline alert (warning/info banner inside the section).
  | {
      type: 'inline-alert';
      message: string;
      variant?: 'warning' | 'info' | 'destructive';
      visibleWhen: Predicate;
    }
  // NEW: avatar type composite (cartoon / upload / url tabs). Wraps the
  // copied AvatarTypeSelector widget and drives `${basePath}.type/.name/.url`.
  | (FieldBase & {
      type: 'avatar-type';
      basePath: string;
    })
  // NEW: image upload widget with preview + delete (used by Resource center
  // header background image and logo).
  | (FieldBase & {
      type: 'image-upload';
      path: string;
      label: string;
      description?: string;
      maxSizeBytes?: number;
      previewAspect?: 'square' | 'wide';
    });

export interface BuilderSection {
  id: string;
  label: string;
  previewWidget: ThemeDetailPreviewType;
  fields: FieldDef[];
}
