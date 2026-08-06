import { THEME_SETTING_CONSTRAINTS, type ThemeSettingConstraint } from '@usertour/constants';
import { z } from 'zod';

import { isHttpUrl } from '@/common/url';

/**
 * The theme `settings` write contract — a zod schema GENERATED from the neutral
 * constraint SSOT (`THEME_SETTING_CONSTRAINTS` in @usertour/constants), NOT from
 * the builder's UI field schema. A parity test keeps that table in sync with the
 * builder, so the two authoring surfaces can't drift while the server depends only
 * on a presentation-free contract.
 *
 * Each writable leaf becomes a typed/range/enum-checked zod; every object is strict
 * (unknown paths rejected) and every key optional (a partial patch — send only what
 * you change, it is field-merged onto the theme's current settings).
 *
 * See docs/architecture/theme-settings-write.md.
 */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const leafSchema = (c: ThemeSettingConstraint): z.ZodTypeAny => {
  switch (c.kind) {
    case 'number': {
      let s = z.number();
      if (c.min !== undefined) s = s.min(c.min);
      if (c.max !== undefined) s = s.max(c.max);
      // The builder has always STORED numeric inputs as strings ("8") — the TS
      // type says number but the runtime data disagrees. Accept the stored
      // shape and normalize to a real number on write, so read-modify-write of
      // existing themes round-trips (console sweep endpoint 7).
      return z.preprocess(
        (v) => (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v.trim()) : v),
        s,
      );
    }
    case 'color': {
      // Stored data carries occasional stray whitespace (" #007AC3") — trim
      // before validating; genuinely malformed values ("#fffffff") still fail.
      const hex = z.preprocess(
        (v) => (typeof v === 'string' ? v.trim() : v),
        z.string().regex(HEX, 'Must be a hex color (e.g. #2563eb)'),
      );
      return c.allowAuto ? z.union([hex, z.literal('Auto')]) : hex;
    }
    case 'enum': {
      const values = c.values;
      if (typeof values[0] === 'number') {
        const literals = (values as readonly number[]).map((v) => z.literal(v));
        return literals.length === 1
          ? literals[0]
          : z.union(
              literals as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]],
            );
      }
      return z.enum([...(values as readonly string[])] as [string, ...string[]]);
    }
    case 'boolean':
      return z.boolean();
    case 'string':
      return z.string();
  }
};

type Tree = { [key: string]: Tree | ThemeSettingConstraint };

const isConstraint = (v: Tree | ThemeSettingConstraint): v is ThemeSettingConstraint =>
  typeof (v as ThemeSettingConstraint).kind === 'string';

/** Nest the flat dotted-path constraints into a tree. */
const buildTree = (flat: Record<string, ThemeSettingConstraint>): Tree => {
  const root: Tree = {};
  for (const [path, constraint] of Object.entries(flat)) {
    const segments = path.split('.');
    let node = root;
    segments.forEach((seg, i) => {
      if (i === segments.length - 1) {
        node[seg] = constraint;
        return;
      }
      const next = node[seg];
      if (!next || isConstraint(next)) {
        node[seg] = {};
      }
      node = node[seg] as Tree;
    });
  }
  return root;
};

/**
 * Color-group companion keys. The SSOT lists only the keys the builder UI
 * exposes, but `ThemeTypesSettingsColor` is one uniform stored shape —
 * `{background, color, hover, active, autoHover?, autoActive?}` — and the
 * builder's color control always persists the whole group (auto* are the
 * derived concrete colors behind 'Auto'). Without these, reading a theme and
 * writing it back failed on unrecognized keys in EVERY stored theme. They are
 * storage companions, not UI fields, so they are completed here rather than
 * added to the SSOT (the builder-parity test pins the SSOT to the UI).
 *
 * The resource-center launcher color group ({background, hover, active,
 * foreground}) is a different type — detected by `foreground` and left alone.
 */
const COLOR_GROUP_KEYS = ['background', 'color', 'hover', 'active'] as const;
const COLOR_COMPANION_KEYS = [...COLOR_GROUP_KEYS, 'autoHover', 'autoActive'] as const;

/**
 * Settings that hold ONE rendered color under `color` — they are NOT color
 * groups, so the completion above must not turn them into one.
 *
 * It used to, and the result was a silent write loss: `resourceCenter.
 * headerBackground` gained a `background` key that validated, stored, and was
 * never read. A reviewer theming a resource center reached for it FIRST —
 * `.background` is the fill everywhere else in this schema — got no error, and
 * shipped a white-on-white header whose close button was invisible. The fill
 * for these lives in `color` (the one inversion of the house convention, which
 * is why guessing goes wrong here).
 *
 * The list is explicit because the SSOT cannot discriminate: `banner.textColor`
 * also declares only `color`, yet IS a real group (the builder persists its
 * hover/active/background). settings.schema.spec pins the list against the
 * built-in default theme's stored shape, which is the actual evidence.
 */
const SINGLE_COLOR_SETTING_PATHS: readonly string[] = [
  'backdrop',
  'backdrop.highlight',
  'focusHighlight',
  'launcherBeacon',
  'progress',
  'survey',
  'xbutton',
  'resourceCenter.headerBackground',
];

/**
 * The schema does NOT accept color-group companion keys on these settings —
 * nothing stores them (the over-completion window of 2026-07/08 left zero
 * residue across the full production dump), so they are plain unknown paths.
 * But they are the one unknown path worth a signpost: `background` IS the fill
 * in every real color group, so it is the first key anyone reaches for, while
 * these settings render `color` (the one inversion of the house convention).
 * This turns the bare strict-mode rejection into directions to the right field.
 */
export const singleColorUnknownKeyHint = (parentPath: string, key: string): string | undefined => {
  // Callers pass body-rooted paths (`settings.backdrop`) or schema-relative
  // ones (`backdrop`) depending on the validation layer.
  const node = parentPath.startsWith('settings.')
    ? parentPath.slice('settings.'.length)
    : parentPath;
  return SINGLE_COLOR_SETTING_PATHS.includes(node) &&
    COLOR_COMPANION_KEYS.some((k) => k !== 'color' && k === key)
    ? `\`${node}\` takes a single color under \`${node}.color\``
    : undefined;
};

const completeColorGroups = (tree: Tree, path = ''): void => {
  const isStandardColorGroup =
    !('foreground' in tree) &&
    !SINGLE_COLOR_SETTING_PATHS.includes(path) &&
    COLOR_GROUP_KEYS.some((k) => {
      const child = tree[k];
      return child && isConstraint(child) && child.kind === 'color';
    });
  if (isStandardColorGroup) {
    for (const key of COLOR_COMPANION_KEYS) {
      if (!(key in tree)) {
        tree[key] = { kind: 'color', allowAuto: true };
      }
    }
  }
  for (const [key, child] of Object.entries(tree)) {
    if (!isConstraint(child)) {
      completeColorGroups(child, path ? `${path}.${key}` : key);
    }
  }
};

/**
 * BUILT-IN / builder-managed keys, deliberately NOT in the SSOT (see its
 * header). They exist in every stored theme, so the schema must ACCEPT them
 * for read-modify-write to round-trip — but they may not be CHANGED via the
 * API: the service rejects a patch whose value differs from the theme's
 * current one (no silent drop, per the strict-body decision). The avatar
 * triple (type+name+url) addresses the builder's built-in avatar collections
 * and must move as one; dividerLines is a builder-internal toggle.
 *
 * NOTE this list used to also hold the logo/header/launcher-icon URLs — that
 * was a scope cut from when theme writes first opened, not a real boundary:
 * the caller is the workspace admin and can already put arbitrary URLs into
 * image/embed content blocks that render to the same end users. Those three
 * are now plainly writable (WRITABLE_MEDIA_URL_PATHS below).
 */
export const BUILDER_MANAGED_SETTING_PATHS: readonly string[] = [
  'avatar.type',
  'avatar.url',
  'avatar.name',
  'resourceCenter.dividerLines',
];

/**
 * Media URLs the API may WRITE. Admin-provided URLs, same trust model as the
 * image/embed content blocks; empty string clears the image. Not in the SSOT
 * because the SSOT mirrors the builder's STYLE form controls (the builder edits
 * these via upload, and the ↔ parity test asserts they stay out of it).
 */
export const WRITABLE_MEDIA_URL_PATHS: readonly string[] = [
  'resourceCenter.logoUrl',
  'resourceCenter.headerBackground.imageUrl',
  'resourceCenterLauncherButton.iconUrl',
];

const addMarkerLeaves = (tree: Tree, paths: readonly string[], marker: string): void => {
  for (const path of paths) {
    const segments = path.split('.');
    let node = tree;
    segments.forEach((seg, i) => {
      if (i === segments.length - 1) {
        // Marker consumed by treeToZod.
        node[seg] = { kind: marker } as unknown as ThemeSettingConstraint;
        return;
      }
      const next = node[seg];
      if (!next || isConstraint(next)) {
        node[seg] = {};
      }
      node = node[seg] as Tree;
    });
  }
};

/** A strict object whose keys are all optional (partial patch + reject unknown). */
const treeToZod = (tree: Tree): z.ZodTypeAny => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, child] of Object.entries(tree)) {
    const leaf = isConstraint(child)
      ? (child.kind as string) === 'builder-managed'
        ? z
            .unknown()
            .describe(
              'Read-only through the API: echo it back unchanged or omit it — a changed value ' +
                'is rejected.',
            )
        : (child.kind as string) === 'media-url'
          ? z
              .string()
              .refine((v) => v === '' || isHttpUrl(v), {
                message: 'must be an http(s) URL, or an empty string to clear the image',
              })
              .describe(
                'Image URL rendered to end users (writable). Empty string clears it. ' +
                  'Any http(s) URL you host.',
              )
          : leafSchema(child)
      : treeToZod(child);
    // Stored settings use null for "unset" in places (e.g. a borderRadius the
    // builder never touched) — treat null exactly like an omitted key: the
    // preprocess strips it BEFORE validation, so a null can never overwrite a
    // stored value. The inner .nullable() is never reached at runtime — it
    // exists so the OpenAPI projection declares null as acceptable and
    // spec-validating clients don't reject the round-trip the server allows.
    shape[key] = z.preprocess((v) => (v === null ? undefined : v), leaf.optional().nullable());
  }
  return z.object(shape).strict();
};

/** The generated partial-settings patch schema (built once from the SSOT). */
const settingsTree = buildTree(
  THEME_SETTING_CONSTRAINTS as unknown as Record<string, ThemeSettingConstraint>,
);
completeColorGroups(settingsTree);
addMarkerLeaves(settingsTree, BUILDER_MANAGED_SETTING_PATHS, 'builder-managed');
addMarkerLeaves(settingsTree, WRITABLE_MEDIA_URL_PATHS, 'media-url');
export const themeSettingsPatchSchema = treeToZod(settingsTree);
export type ThemeSettingsPatch = z.infer<typeof themeSettingsPatchSchema>;

/**
 * READ-side normalization. The builder has always stored some numeric inputs
 * as strings ("22") and colors with stray whitespace — the WRITE schema accepts
 * and normalizes those shapes, but reads echoed the raw stored JSON, so a
 * field the contract declares `number` came back as a string (read-only-
 * credential audit: border.borderRadius "22"). Walk the stored value against
 * the constraint SSOT and coerce ONLY known leaves (numeric strings → number,
 * colors trimmed); unknown keys and non-coercible values pass through
 * untouched — read fidelity over cleverness.
 */
export function normalizeStoredSettings<T>(value: T): T {
  const walk = (node: unknown, tree: Tree | ThemeSettingConstraint): unknown => {
    if (isConstraint(tree)) {
      if (
        tree.kind === 'number' &&
        typeof node === 'string' &&
        /^-?\d+(\.\d+)?$/.test(node.trim())
      ) {
        return Number(node.trim());
      }
      if (tree.kind === 'color' && typeof node === 'string') {
        return node.trim();
      }
      return node;
    }
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return node;
    }
    const out: Record<string, unknown> = { ...(node as Record<string, unknown>) };
    for (const [key, child] of Object.entries(tree)) {
      if (key in out) {
        out[key] = walk(out[key], child);
      }
    }
    return out;
  };
  return walk(value, settingsTree) as T;
}
