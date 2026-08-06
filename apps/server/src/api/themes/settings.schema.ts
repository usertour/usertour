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
 * Color-group key vocabulary. The stored `ThemeTypesSettingsColor` is one
 * uniform shape — `{background, color, hover, active, autoHover?, autoActive?}`
 * — persisted whole by the builder's color control even where a setting only
 * renders some of the keys. The CONTRACT does not mirror that template: each
 * color node accepts exactly the keys the renderer reads (see
 * COLOR_GROUP_KEY_SETS / SINGLE_COLOR_SETTINGS), reads strip the stored
 * remainder, and writes reject it with a signpost.
 */
const COLOR_GROUP_KEYS = ['background', 'color', 'hover', 'active'] as const;
const COLOR_COMPANION_KEYS = [...COLOR_GROUP_KEYS, 'autoHover', 'autoActive'] as const;
const AUTO_KEYS = ['autoHover', 'autoActive'] as const;

/**
 * The ALLOWED key set per multi-key color node — the renderer's actual reads,
 * audited key-by-key against convert-settings + the widget (2026-08-06):
 * - text/border colors have no `background`; fills have no `color`;
 * - `autoHover`/`autoActive` exist only where the server persists them on
 *   write (deriveThemeAutoColors: the base pair + the six `buttons.*` groups);
 *   every other group resolves 'Auto' at render time from the cascade;
 * - the checklist-launcher counter badge is a {background, color} pair — it
 *   has no interactive states;
 * - the resource-center launcher uses `foreground` where everything else says
 *   `color` (its stored type differs).
 * completeColorGroups fails LOUDLY on a color node missing from both this
 * table and SINGLE_COLOR_SETTINGS, so a new setting cannot silently inherit
 * the old six-key template.
 */
const TEXT_WITH_AUTO = ['color', 'hover', 'active', ...AUTO_KEYS] as const;
const FILL_WITH_AUTO = ['background', 'hover', 'active', ...AUTO_KEYS] as const;
const COLOR_GROUP_KEY_SETS: Readonly<Record<string, readonly string[]>> = {
  mainColor: COLOR_COMPANION_KEYS,
  brandColor: COLOR_COMPANION_KEYS,
  'buttons.primary.textColor': TEXT_WITH_AUTO,
  'buttons.primary.backgroundColor': FILL_WITH_AUTO,
  'buttons.primary.border.color': TEXT_WITH_AUTO,
  'buttons.secondary.textColor': TEXT_WITH_AUTO,
  'buttons.secondary.backgroundColor': FILL_WITH_AUTO,
  'buttons.secondary.border.color': TEXT_WITH_AUTO,
  'launcherButtons.primary.textColor': ['color', 'hover', 'active'],
  'launcherButtons.primary.backgroundColor': ['background', 'hover', 'active'],
  'launcherButtons.primary.border.color': ['color', 'hover', 'active'],
  'launcherIcon.color': ['color', 'hover', 'active'],
  'checklistLauncher.color': ['background', 'color', 'hover', 'active'],
  'checklistLauncher.counter': ['background', 'color'],
  'resourceCenterLauncherButton.color': ['background', 'foreground', 'hover', 'active'],
};

/**
 * Settings that hold ONE authorable color (map value = the key that renders) —
 * they are NOT color groups, so the completion above must not turn them into
 * one.
 *
 * It used to, and the result was a silent write loss: `resourceCenter.
 * headerBackground` gained a `background` key that validated, stored, and was
 * never read. A reviewer theming a resource center reached for it FIRST —
 * `.background` is the fill everywhere else in this schema — got no error, and
 * shipped a white-on-white header whose close button was invisible. The fill
 * for most of these lives in `color` (the one inversion of the house
 * convention, which is why guessing goes wrong here).
 *
 * Two kinds of evidence back the list (the SSOT cannot discriminate):
 * - For the `color`-keyed entries, the built-in default theme stores exactly
 *   one color on each — pinned by settings.schema.spec.
 * - The banner pair DOES store a legacy {background,color,hover,active} shape
 *   (defaults + every stored theme), but the renderer recomputes hover/active
 *   unconditionally from the two base colors (convert-settings' banner block),
 *   so the companions carry no information: reads strip them
 *   (normalizeStoredSettings), writes reject them with the signpost below.
 */
const SINGLE_COLOR_SETTINGS: Readonly<Record<string, string>> = {
  backdrop: 'color',
  'backdrop.highlight': 'color',
  focusHighlight: 'color',
  launcherBeacon: 'color',
  progress: 'color',
  survey: 'color',
  xbutton: 'color',
  'resourceCenter.headerBackground': 'color',
  'banner.backgroundColor': 'background',
  'banner.textColor': 'color',
};

/** Unified allowed-keys lookup covering both single-color and group nodes. */
const allowedColorKeys = (path: string): readonly string[] | undefined => {
  const single = SINGLE_COLOR_SETTINGS[path];
  return single !== undefined ? [single] : COLOR_GROUP_KEY_SETS[path];
};

/**
 * A color-group key the node does not take is a plain unknown path (reads
 * never return one — normalizeStoredSettings strips the stored template
 * remainder), but it is the one unknown path worth a signpost: `background`
 * IS the fill in most groups yet absent on text/border colors, single-color
 * settings render `color`, and the RC launcher says `foreground` — the exact
 * spots where reaching by convention goes wrong. This turns the bare
 * strict-mode rejection into directions to the right field.
 */
export const unknownColorKeyHint = (parentPath: string, key: string): string | undefined => {
  // Callers pass body-rooted paths (`settings.backdrop`) or schema-relative
  // ones (`backdrop`) depending on the validation layer.
  const node = parentPath.startsWith('settings.')
    ? parentPath.slice('settings.'.length)
    : parentPath;
  const allowed = allowedColorKeys(node);
  if (!allowed || allowed.includes(key) || !COLOR_COMPANION_KEYS.some((k) => k === key)) {
    return undefined;
  }
  return allowed.length === 1
    ? `\`${node}\` takes a single color under \`${node}.${allowed[0]}\``
    : `\`${node}\` has no \`${key}\` — it takes {${allowed.join(', ')}}`;
};

const completeColorGroups = (tree: Tree, path = ''): void => {
  const allowed = COLOR_GROUP_KEY_SETS[path];
  if (allowed) {
    for (const key of allowed) {
      if (!(key in tree)) {
        tree[key] = { kind: 'color', allowAuto: true };
      }
    }
  } else if (
    !(path in SINGLE_COLOR_SETTINGS) &&
    COLOR_GROUP_KEYS.some((k) => {
      const child = tree[k];
      return child && isConstraint(child) && child.kind === 'color';
    })
  ) {
    // Exhaustiveness tripwire: a color node the tables don't classify would
    // silently fall back to guesswork — refuse to build the schema instead.
    throw new Error(
      `Unclassified color node "${path}" — add it to COLOR_GROUP_KEY_SETS or SINGLE_COLOR_SETTINGS (settings.schema.ts) with the keys the renderer reads.`,
    );
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
 *
 * One deliberate exception to pass-through: on a single-color setting, stored
 * color-group companion keys are STRIPPED. The banner pair stores a legacy
 * {background,color,hover,active} shape whose companions the renderer ignores
 * (hover/active are recomputed from the base colors on every render) — echoing
 * them would advertise keys the write schema rejects, breaking read-modify-write.
 */
export function normalizeStoredSettings<T>(value: T): T {
  const walk = (node: unknown, tree: Tree | ThemeSettingConstraint, path: string): unknown => {
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
    const allowed = allowedColorKeys(path);
    if (allowed) {
      for (const key of COLOR_COMPANION_KEYS) {
        if (!allowed.includes(key)) delete out[key];
      }
    }
    for (const [key, child] of Object.entries(tree)) {
      if (key in out) {
        out[key] = walk(out[key], child, path ? `${path}.${key}` : key);
      }
    }
    return out;
  };
  return walk(value, settingsTree, '') as T;
}
