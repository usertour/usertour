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
      return s;
    }
    case 'color': {
      const hex = z.string().regex(HEX, 'Must be a hex color (e.g. #2563eb)');
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

/** A strict object whose keys are all optional (partial patch + reject unknown). */
const treeToZod = (tree: Tree): z.ZodTypeAny => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, child] of Object.entries(tree)) {
    shape[key] = (isConstraint(child) ? leafSchema(child) : treeToZod(child)).optional();
  }
  return z.object(shape).strict();
};

/** The generated partial-settings patch schema (built once from the SSOT). */
export const themeSettingsPatchSchema = treeToZod(
  buildTree(THEME_SETTING_CONSTRAINTS as unknown as Record<string, ThemeSettingConstraint>),
);
export type ThemeSettingsPatch = z.infer<typeof themeSettingsPatchSchema>;
