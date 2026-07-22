import { THEME_SETTING_CONSTRAINTS, type ThemeSettingConstraint } from '@usertour/constants';
import { z } from 'zod';

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

const completeColorGroups = (tree: Tree): void => {
  const isStandardColorGroup =
    !('foreground' in tree) &&
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
  for (const child of Object.values(tree)) {
    if (!isConstraint(child)) {
      completeColorGroups(child);
    }
  }
};

/**
 * Media-asset / builder-managed keys, deliberately NOT in the SSOT (see its
 * header). They exist in every stored theme, so the schema must ACCEPT them
 * for read-modify-write to round-trip — but they may not be CHANGED via the
 * API: the service rejects a patch whose value differs from the theme's
 * current one (no silent drop, per the strict-body decision).
 */
export const BUILDER_MANAGED_SETTING_PATHS: readonly string[] = [
  'avatar.type',
  'avatar.url',
  'avatar.name',
  'resourceCenter.logoUrl',
  'resourceCenter.headerBackground.imageUrl',
  'resourceCenter.dividerLines',
  'resourceCenterLauncherButton.iconUrl',
];

const addBuilderManagedLeaves = (tree: Tree): void => {
  for (const path of BUILDER_MANAGED_SETTING_PATHS) {
    const segments = path.split('.');
    let node = tree;
    segments.forEach((seg, i) => {
      if (i === segments.length - 1) {
        // Marker consumed by treeToZod: accept anything, guard in the service.
        node[seg] = { kind: 'builder-managed' } as unknown as ThemeSettingConstraint;
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
        ? z.unknown()
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
addBuilderManagedLeaves(settingsTree);
export const themeSettingsPatchSchema = treeToZod(settingsTree);
export type ThemeSettingsPatch = z.infer<typeof themeSettingsPatchSchema>;
