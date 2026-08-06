import { Injectable } from '@nestjs/common';
import { toArray } from '../shared/query';
import { Prisma, type Theme as PrismaTheme } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { cuid, deepMergeThemeSettings, deriveThemeAutoColors } from '@usertour/helpers';
import { type ThemeTypesSetting } from '@usertour/types';
import { defaultSettings } from '@usertour/constants';
import { PrismaService } from 'nestjs-prisma';

import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';

import {
  CustomCssPlanRequiredError,
  DefaultThemeCannotBeDeletedError,
  SystemThemeCannotBeChangedError,
  ThemeNotFoundError,
  ValidationError,
} from '@/common/errors/errors';
import { ProjectsService } from '@/projects/projects.service';
import { ThemesService } from '@/themes/themes.service';

import {
  buildDecompileResolversFrom,
  loadDecompileResolvers,
  loadResolvers,
} from '../content-representation/attribute-resolvers';
import { loadConditionContext } from '../content-representation/condition-context';
import { collectRuleIssues } from '../content-representation/condition-validate';
import { compileConditions } from '../content-representation/rules.compile';
import { nameContains } from '@/common/filters';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import {
  BUILDER_MANAGED_SETTING_PATHS,
  unknownColorKeyHint,
  themeSettingsPatchSchema,
} from './settings.schema';
import { mapTheme } from './themes.mapper';
import {
  DuplicateThemeBody,
  CreateThemeBody,
  GetThemeQuery,
  ListThemesQuery,
  Theme,
  ThemeExpand,
  themeVariationInput,
  type ThemeVariationInput,
  UpdateThemeBody,
} from './themes.schema';
import { z } from 'zod';

const FULL: ThemeExpand[] = ['settings', 'variations'];

/**
 * v2 themes handler. Reads the base theme always; `settings` / `variations` are
 * opt-in via expand. Settings pass through as-is; variation conditions go through
 * the shared rules codec (id <-> code). Depends on the domain {@link ThemesService}.
 */
@Injectable()
export class ApiThemesService {
  constructor(
    private readonly themes: ThemesService,
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListThemesQuery,
  ): Promise<{ results: Theme[]; next: string | null; previous: string | null }> {
    const { limit, cursor, name } = query;
    const expand = toArray(query.expand);
    // Resolvers are only consumed when decompiling variation conditions; skip the
    // two catalog queries on the common read path that doesn't expand variations.
    const resolvers = expand.includes('variations')
      ? await loadDecompileResolvers(this.prisma, projectId)
      : buildDecompileResolversFrom([], []);
    const orderBy = parseOrderBy(query.orderBy, [
      'createdAt',
    ]) as Prisma.ThemeOrderByWithRelationInput[];
    const nameFilter = nameContains(name);
    const where: Prisma.ThemeWhereInput = {
      projectId,
      deleted: false,
      ...(nameFilter ? { name: nameFilter } : {}),
    };

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        findManyCursorConnection<PrismaTheme, Prisma.ThemeWhereUniqueInput>(
          (args) => this.prisma.theme.findMany({ where, orderBy, ...args }),
          () => this.prisma.theme.count({ where }),
          params,
        ),
      map: (row) => mapTheme(row, expand, resolvers),
    });
  }

  async get(id: string, projectId: string, query: GetThemeQuery): Promise<Theme> {
    const expand = toArray(query.expand);
    const theme = await this.requireTheme(id, projectId);
    const resolvers = expand.includes('variations')
      ? await loadDecompileResolvers(this.prisma, projectId)
      : buildDecompileResolversFrom([], []);
    return mapTheme(theme, expand, resolvers);
  }

  /**
   * Validate a settings patch against the neutral constraint SSOT. Done here (not
   * only in the REST pipe) so the MCP path — which bypasses the controller — is
   * equally strict. Mirrors the content codec's `parse`.
   */
  private parseSettingsPatch(settings: unknown): Partial<ThemeTypesSetting> {
    const result = themeSettingsPatchSchema.safeParse(settings);
    if (!result.success) {
      const issue = result.error.issues[0];
      let message = issue
        ? issue.path.length
          ? `${issue.path.join('.')}: ${issue.message}`
          : issue.message
        : 'Invalid theme settings';
      // Signpost the one habitual unknown path: a color-group companion key on
      // a color node that does not take it (see unknownColorKeyHint).
      if (issue?.code === 'unrecognized_keys') {
        const hint = issue.keys
          .map((key) => unknownColorKeyHint(issue.path.join('.'), key))
          .find(Boolean);
        if (hint) message += ` — ${hint}`;
      }
      throw new ValidationError(message);
    }
    return result.data as Partial<ThemeTypesSetting>;
  }

  /**
   * Built-in / builder-managed keys (the avatar identity triple + the
   * dividerLines toggle) are accepted by the schema so that reading a theme
   * and writing the settings back round-trips — but they may not be CHANGED
   * through the API. Echoing the current value (or omitting the key) is fine;
   * a differing value is rejected explicitly rather than silently dropped.
   * (The logo/header/launcher-icon URLs are plainly writable — see
   * WRITABLE_MEDIA_URL_PATHS.)
   */
  private assertBuilderManagedUnchanged(patch: unknown, base: unknown): void {
    const at = (obj: unknown, path: string): unknown =>
      path
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
    const isChanged = (path: string): boolean => {
      const patched = at(patch, path);
      return patched !== undefined && JSON.stringify(patched) !== JSON.stringify(at(base, path));
    };
    const changed = BUILDER_MANAGED_SETTING_PATHS.filter(isChanged);
    if (changed.length) {
      // Report EVERY violated path at once (issues carry them individually) —
      // the one-at-a-time fail-fast made callers discover this boundary by
      // round-tripping once per field.
      const paths = changed.map((path) => `settings.${path}`);
      throw new ValidationError(
        `${paths.join(', ')} ${paths.length === 1 ? 'is' : 'are'} read-only through the API — write them back unchanged or omit them.`,
        paths.map((path) => ({
          rule: 'schema',
          path,
          message: 'read-only through the API: echo back unchanged or omit',
        })),
      );
    }
  }

  /**
   * Custom CSS is plan-gated (Growth+). The builder blocks the field behind an
   * upsell on this same predicate; here, INTRODUCING or CHANGING a non-empty
   * `customCss` on a plan without it is refused (E1038) instead of being stored
   * and then silently stripped at delivery. Echoing the stored value unchanged
   * and clearing it stay legal, so read-modify-write and cleanup never gate.
   * The predicate is the SAME ProjectConfig the session builder's strip reads
   * (self-host: always on), so the two can't drift.
   */
  private async assertCustomCssAllowed(
    patch: Partial<ThemeTypesSetting>,
    base: Partial<ThemeTypesSetting>,
    projectId: string,
  ): Promise<void> {
    const next = (patch as { customCss?: unknown }).customCss;
    if (typeof next !== 'string' || next.trim() === '') {
      return; // absent or clearing
    }
    const current = (base as { customCss?: unknown }).customCss;
    if (typeof current === 'string' && current === next) {
      return; // stored echo
    }
    const config = await this.projects.getProjectConfig(projectId);
    if (!config.customCss) {
      throw new CustomCssPlanRequiredError();
    }
  }

  /**
   * Parse + compile a `variations` write into the stored shape. Validation lives
   * HERE (not the body schema) so the MCP path — whose tool exposes variations
   * as a permissive array to keep tools/list lean — is exactly as strict as REST.
   *
   * Semantics, mirroring the builder's model:
   * - The list is a FULL replacement (array order = evaluation priority; the
   *   runtime takes the first variation whose conditions match).
   * - Each variation stores a COMPLETE settings object (a copy that diverges
   *   from the base). A write's `settings` is a PATCH: onto the echoed
   *   variation's stored settings (`id` present), else onto the theme's base —
   *   so read-modify-write and "new variation = base + delta" both hold.
   * - Conditions are restricted to the BROWSER-evaluable set: the SDK picks the
   *   variation client-side on each render (usertour-theme.getThemeSettings),
   *   so segment / event / content_state (server-evaluated) can never apply.
   * - Per-variation, the same guards as the base settings: builder-managed keys
   *   echo-only, customCss plan gate (a variation must not smuggle css past
   *   E1038 — the session builder strips variation css by the same predicate),
   *   auto colors derived.
   */
  private async compileVariationsInput(
    raw: unknown,
    storedVariations: { id?: string; settings?: unknown }[],
    baseSettings: ThemeTypesSetting,
    projectId: string,
  ): Promise<JsonValue> {
    const parsed = z.array(themeVariationInput).safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue
        ? issue.path.length
          ? `variations.${issue.path.join('.')}: ${issue.message}`
          : issue.message
        : 'Invalid variations';
      throw new ValidationError(message);
    }
    const input: ThemeVariationInput[] = parsed.data as ThemeVariationInput[];
    const resolvers = await loadResolvers(this.prisma, projectId);
    const conditionCtx = await loadConditionContext(this.prisma, projectId);
    const storedById = new Map(storedVariations.map((v) => [v.id, v]));
    const out = [];
    for (const [i, v] of input.entries()) {
      const at = `variations[${i}]`;
      this.assertVariationConditionTypes(v.conditions, `${at}.conditions`);
      const compiled = compileConditions(
        v.conditions as unknown as Parameters<typeof compileConditions>[0],
        resolvers.compile,
      );
      const issues = collectRuleIssues(compiled, conditionCtx, `${at}.conditions`);
      if (issues.length) {
        throw new ValidationError(
          `Invalid variation conditions: ${issues.map((x) => `${x.path}: ${x.message}`).join('; ')}`,
        );
      }
      const prev = v.id ? storedById.get(v.id) : undefined;
      if (v.id && !prev) {
        throw new ValidationError(
          `${at}.id "${v.id}" does not match an existing variation — echo an id from get_theme (expand: ["variations"]) to update one in place, or omit \`id\` to create a new variation.`,
        );
      }
      const mergeBase = (prev?.settings ?? baseSettings) as Partial<ThemeTypesSetting>;
      const patch = v.settings ? this.parseSettingsPatch(v.settings) : {};
      this.assertBuilderManagedUnchanged(patch, mergeBase);
      await this.assertCustomCssAllowed(patch, mergeBase, projectId);
      const settings = deriveThemeAutoColors(
        deepMergeThemeSettings(deepMergeThemeSettings(defaultSettings, mergeBase), patch),
      );
      out.push({ id: v.id ?? cuid(), name: v.name, conditions: compiled, settings });
    }
    return out as unknown as JsonValue;
  }

  /**
   * A variation is chosen in the BROWSER at render time against the attributes
   * shipped with the session. The accepted type set ALIGNS WITH THE THEME
   * BUILDER's variation editor (user decision 2026-07-29: capability parity
   * over runtime-maximal) — anything else is refused with directions instead
   * of stored as a condition the builder can't edit.
   */
  private assertVariationConditionTypes(conditions: unknown, path: string): void {
    // The theme builder's variation editor offers exactly this set (user
    // attribute / current page / group) — the API mirrors it so both surfaces
    // author the same shapes.
    const ALLOWED = new Set(['attribute', 'current_url', 'group']);
    const walk = (conds: unknown, p: string): void => {
      if (!Array.isArray(conds)) return;
      conds.forEach((c, i) => {
        const at = `${p}[${i}]`;
        const type = (c as { type?: unknown })?.type;
        if (type === 'unsupported') {
          throw new ValidationError(
            `"unsupported" at ${at} is a read-side placeholder for a stored condition this API cannot express — it cannot be written back. Remove it (which DELETES that stored condition) or migrate the variation's conditions in the Usertour app first.`,
          );
        }
        if (typeof type !== 'string' || !ALLOWED.has(type)) {
          throw new ValidationError(
            `Variation conditions support only user attribute / current_url conditions (and groups of them); got "${String(type)}" at ${at}. Put audience logic in the CONTENT start rules; drive state-based styling (e.g. dark mode) off a user attribute your app sets.`,
          );
        }
        if (type === 'attribute' && (c as { scope?: unknown }).scope !== 'user') {
          throw new ValidationError(
            `Variation attribute conditions take scope "user" (the builder's variation editor offers user attributes); got scope "${String((c as { scope?: unknown }).scope)}" at ${at}.`,
          );
        }
        if (type === 'group') walk((c as { conditions?: unknown }).conditions, `${at}.conditions`);
      });
    };
    walk(conditions, path);
  }

  /**
   * Create a theme. Starts from the fixed built-in `defaultSettings` (a neutral base — NOT a
   * copy of the project's default / isDefault theme); an optional `settings` patch is
   * field-merged onto it and auto colors derived. `variations` compile per
   * {@link compileVariationsInput} (new-variation merge base = this theme's settings).
   */
  async create(projectId: string, body: CreateThemeBody): Promise<Theme> {
    let settings: ThemeTypesSetting = defaultSettings;
    if (body.settings) {
      const patch = this.parseSettingsPatch(body.settings);
      this.assertBuilderManagedUnchanged(patch, defaultSettings);
      await this.assertCustomCssAllowed(patch, defaultSettings, projectId);
      settings = deriveThemeAutoColors(deepMergeThemeSettings(defaultSettings, patch));
    }
    const variations =
      body.variations !== undefined
        ? await this.compileVariationsInput(body.variations, [], settings, projectId)
        : ([] as unknown as JsonValue);
    const created = await this.themes.createTheme({
      projectId,
      name: body.name,
      isDefault: body.isDefault ?? false,
      settings: settings as unknown as JsonValue,
      variations,
    });
    // The decompile resolvers only serve variation-condition id<->code mapping —
    // load them only when variations were actually written (the common
    // variation-less create skips the two catalog queries, same as list()/get()).
    const resolvers =
      body.variations !== undefined
        ? await loadDecompileResolvers(this.prisma, projectId)
        : buildDecompileResolversFrom([], []);
    return mapTheme(created, FULL, resolvers);
  }

  /**
   * Duplicate a theme into a fresh non-default theme (settings + variations
   * copied verbatim — the builder's copy dialog path, via the same domain
   * method). System themes may be duplicated: that is the natural "derive a
   * custom theme from Standard Light" flow.
   */
  async duplicate(id: string, projectId: string, body: DuplicateThemeBody): Promise<Theme> {
    const source = await this.requireTheme(id, projectId);
    const created = await this.themes.copyTheme({ id: source.id, name: body.name ?? source.name });
    const resolvers =
      Array.isArray(created.variations) && created.variations.length > 0
        ? await loadDecompileResolvers(this.prisma, projectId)
        : buildDecompileResolversFrom([], []);
    return mapTheme(created, FULL, resolvers);
  }

  /**
   * Update a theme's metadata and/or styling. A `settings` patch is field-merged onto
   * the theme's current settings and auto colors are re-derived. System themes reject
   * CONTENT changes only — `isDefault: true` is a project-state pointer, not a theme
   * modification, and stays allowed (the builder can default a system theme; without
   * this the default is a one-way door: once moved off a system theme, the API could
   * never move it back).
   */
  async update(id: string, projectId: string, body: UpdateThemeBody): Promise<Theme> {
    const theme = await this.requireTheme(id, projectId);
    if (
      theme.isSystem &&
      (body.name !== undefined || body.settings !== undefined || body.variations !== undefined)
    ) {
      throw new SystemThemeCannotBeChangedError();
    }
    // Ground the stored settings on the complete defaultSettings before patching —
    // the same fill the builder does on load (theme-builder.tsx: deepmerge(defaultSettings,
    // settings)) and create() does. A legacy theme whose stored JSON predates a nested
    // field (e.g. buttons.primary.border) would otherwise reach deriveThemeAutoColors
    // incomplete and 500 on its deep dereferences.
    let settingsUpdate = {};
    if (body.settings !== undefined) {
      const patch = this.parseSettingsPatch(body.settings);
      // Base = the STORED settings (exactly what reads return), so echoing a
      // read response back is always accepted.
      this.assertBuilderManagedUnchanged(patch, theme.settings ?? {});
      await this.assertCustomCssAllowed(
        patch,
        (theme.settings ?? {}) as Partial<ThemeTypesSetting>,
        projectId,
      );
      settingsUpdate = {
        settings: deriveThemeAutoColors(
          deepMergeThemeSettings(
            deepMergeThemeSettings(
              defaultSettings,
              (theme.settings ?? {}) as Partial<ThemeTypesSetting>,
            ),
            patch,
          ),
        ) as unknown as JsonValue,
      };
    }
    // The domain updateTheme deliberately drops isDefault (the builder moves the
    // default via its dedicated setDefaultTheme action), so passing it through
    // would be a silent no-op. Route the flag to the same domain primitive here.
    // Unsetting is refused: a project must keep a default theme (create_content
    // falls back to it) — the way to change it is defaulting ANOTHER theme.
    if (body.isDefault === false && theme.isDefault) {
      throw new ValidationError(
        'Cannot unset the default theme — set another theme as the default instead.',
      );
    }
    // Variations: full-list replacement. New variations merge onto the base
    // settings AS OF THIS WRITE (the just-patched value when settings ride the
    // same call), echoed ones onto their own stored settings.
    let variationsUpdate = {};
    if (body.variations !== undefined) {
      const newBase = ((settingsUpdate as { settings?: unknown }).settings ??
        deepMergeThemeSettings(
          defaultSettings,
          (theme.settings ?? {}) as Partial<ThemeTypesSetting>,
        )) as ThemeTypesSetting;
      const stored = Array.isArray(theme.variations)
        ? (theme.variations as { id?: string; settings?: unknown }[])
        : [];
      variationsUpdate = {
        variations: await this.compileVariationsInput(body.variations, stored, newBase, projectId),
      };
    }
    const metadataUpdate = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...settingsUpdate,
      ...variationsUpdate,
    };
    let updated =
      Object.keys(metadataUpdate).length > 0
        ? await this.themes.updateTheme({ id, ...metadataUpdate })
        : theme;
    if (body.isDefault === true && !theme.isDefault) {
      updated = await this.themes.setDefaultTheme(id);
    }
    const resolvers = await loadDecompileResolvers(this.prisma, projectId);
    return mapTheme(updated, FULL, resolvers);
  }

  /**
   * Delete a theme. Default / system themes refuse as 409 state conflicts with
   * their own codes (E1034 / E1035) — not E1017, which would tell the caller to
   * fix a request that can never succeed by retrying. Same family as E1031.
   */
  async delete(id: string, projectId: string): Promise<void> {
    const theme = await this.requireTheme(id, projectId);
    // Permanent refusal FIRST: E1034's advice ("move the default, then retry")
    // must only be given when following it can succeed. A default+system theme
    // (every fresh project's out-of-the-box state) can never be deleted — E1034
    // would send the caller to move the default and then hit E1035 anyway.
    if (theme.isSystem) {
      throw new SystemThemeCannotBeChangedError();
    }
    if (theme.isDefault) {
      throw new DefaultThemeCannotBeDeletedError();
    }
    await this.themes.deleteTheme(id);
  }

  /** Load a live theme that belongs to the project, or throw E1021. Shared with the version themeId write. */
  async requireTheme(id: string, projectId: string) {
    const theme = await this.themes.getTheme(id);
    if (!theme || theme.projectId !== projectId || (theme as { deleted?: boolean }).deleted) {
      throw new ThemeNotFoundError();
    }
    return theme;
  }
}
