import { Injectable } from '@nestjs/common';
import { toArray } from '../shared/query';
import { cuid } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import type { RulesCondition, Step } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  ParamsError,
  ValidationError,
  type ValidationIssue,
} from '@/common/errors/errors';
import { ContentService, type WriteActor } from '@/content/content.service';
import { ApiThemesService } from '../themes/themes.service';

import { loadConditionContext } from '../content-representation/condition-context';
import { CONTENT_REFERENCE_TARGET_TYPE_SET } from '../content-representation/contract-map';
import {
  type ContentReference,
  collectWriteViolations,
} from '../content-representation/write-guards';
import { compileStep } from '../content-representation/representation.compile';
import { decompileStep } from '../content-representation/representation.decompile';
import { ContentVersion } from '../content-representation/representation.schema';
import {
  CompileResolvers,
  compileHideRules,
  compileStartRules,
} from '../content-representation/rules.compile';
import {
  DecompileResolvers,
  decompileHideRules,
  decompileStartRules,
} from '../content-representation/rules.decompile';
import {
  loadDecompileResolvers,
  loadResolvers,
} from '../content-representation/attribute-resolvers';
import {
  type UsabilityReport,
  validateVersionUsable,
} from '../content-representation/usable.validate';
import { validateAutoStartForType } from '../content-representation/auto-start.validate';
import { compileVersionData } from '../content-representation/version-data.compile';
import { decompileVersionData } from '../content-representation/version-data.decompile';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapQuestions, mapVersion } from './content-versions.mapper';
import {
  GetContentVersionQuery,
  ListContentVersionsQuery,
  UpdateVersionBody,
} from './content-versions.schema';

type VersionNode = {
  id: string;
  sequence: number;
  themeId: string | null;
  config?: unknown;
  data?: unknown;
  content?: { type?: string | null } | null;
  // Present when the steps/questions expand was requested — the domain query
  // includes them in the SAME fetch, so toVersion needn't re-load per node (N+1).
  steps?: {
    id: string;
    cvid: string | null;
    name: string | null;
    type: string | null;
    themeId?: string | null;
    sequence: number;
    data: unknown;
    target?: unknown;
    setting?: unknown;
    trigger?: unknown;
  }[];
  updatedAt: Date;
  createdAt: Date;
};

/** Whether the response needs the version's step rows (either expand pulls them). */
const needsSteps = (expand: string[]): boolean =>
  expand.includes('steps') || expand.includes('questions');

/**
 * v2 content-versions handler. Depends on the domain {@link ContentService}; the
 * `questions` and `steps` expands both derive from the version's step rows, which
 * the service loads once. Rules (start/hide rules on the version, triggers /
 * button & answer actions on steps) reference attributes / events by stable code
 * — the service builds the id→code resolvers once per request.
 */
@Injectable()
export class ApiContentVersionsService {
  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
    private readonly themes: ApiThemesService,
  ) {}

  async get(
    id: string,
    contentId: string,
    projectId: string,
    query: GetContentVersionQuery,
    // Write paths that already loaded the catalogs pass their decompile side in,
    // so the read-back doesn't re-run the two catalog queries.
    preloadedResolvers?: DecompileResolvers,
  ): Promise<ContentVersion> {
    const expand = toArray(query.expand);
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
      // Fetch steps in the same query when the response needs them (steps or
      // questions expand) instead of a second round-trip in toVersion.
      ...(needsSteps(expand) ? { steps: true } : {}),
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const resolvers = preloadedResolvers ?? (await loadDecompileResolvers(this.prisma, projectId));
    return this.toVersion(version, projectId, expand, resolvers);
  }

  async list(
    requestUrl: string,
    projectId: string,
    contentId: string,
    query: ListContentVersionsQuery,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { limit, cursor } = query;
    const expand = toArray(query.expand);
    const orderBy = parseOrderBy(query.orderBy, ['createdAt']);

    // Scope the existence check to the project so a foreign contentId is a 404,
    // not a 200-empty (which would leak cross-tenant content-id existence).
    const content = await this.content.findContentWithRelations(contentId, projectId, {});
    if (!content) {
      throw new ContentNotFoundError();
    }
    const resolvers = await loadDecompileResolvers(this.prisma, projectId);

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        this.content.listContentVersionsWithRelations(
          projectId,
          contentId,
          params,
          // Steps in the SAME query when expanded — avoids one findFirst per node.
          { content: true, ...(needsSteps(expand) ? { steps: true } : {}) },
          orderBy,
        ),
      map: (node) => this.toVersion(node, projectId, expand, resolvers),
    });
  }

  /**
   * Build the API version. `questions` and `steps` derive from the version's step
   * rows (loaded once when either expand is set); start/hide rules come from the
   * version config and are always included.
   */
  private async toVersion(
    version: VersionNode,
    projectId: string,
    expand: string[],
    resolvers: DecompileResolvers,
  ): Promise<ContentVersion> {
    const startRules = decompileStartRules(version.config, resolvers);
    const hideRules = decompileHideRules(version.config, resolvers);
    const rules = {
      ...(startRules ? { startRules } : {}),
      ...(hideRules ? { hideRules } : {}),
    };
    // Type-specific body (checklist / launcher / banner / tracker / resource-center).
    const data =
      expand.includes('data') && version.content?.type
        ? decompileVersionData(version.content.type, version.data, resolvers)
        : undefined;

    const wantsQuestions = expand.includes('questions');
    const wantsSteps = expand.includes('steps');
    if (!wantsQuestions && !wantsSteps) {
      return mapVersion(version, null, undefined, rules, data);
    }
    // Steps were loaded in the list/get query (needsSteps === true here). Fall back
    // to a lookup only if a caller passed a node without them (defensive).
    const steps = version.steps ?? (await this.loadSteps(version.id, projectId));
    const questions = wantsQuestions ? mapQuestions(steps) : null;
    const decompiled = wantsSteps ? steps.map((s) => decompileStep(s, resolvers)) : undefined;
    return mapVersion(version, questions, decompiled, rules, data);
  }

  private async loadSteps(versionId: string, projectId: string) {
    const version = await this.content.getContentVersionWithRelations(versionId, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
    });
    return version?.steps ?? [];
  }

  /**
   * Write a draft version: compile the representation steps + rules and field-merge
   * them onto the existing internal version, then delegate persistence to the
   * domain `updateContentVersion` (the builder's exact path — cvid upsert in a
   * transaction). Only the provided fields are touched.
   */
  /**
   * Ensure an EDITABLE draft version (the builder's semantics): while the
   * content's edited version is an unpublished draft it is simply returned —
   * editing continues there, no gratuitous fork. Only when the edited version is
   * PUBLISHED (locked) does the domain fork it into a fresh draft, which becomes
   * the new editedVersion; the published one is frozen as history.
   */
  async create(projectId: string, contentId: string, actor?: WriteActor): Promise<ContentVersion> {
    const content = await this.content.findContentWithRelations(contentId, projectId, {});
    if (!content || (content as { deleted?: boolean }).deleted) {
      throw new ContentNotFoundError();
    }
    const editedVersionId = (content as { editedVersionId?: string | null }).editedVersionId;
    if (!editedVersionId) {
      throw new ParamsError('Content has no editable version to fork');
    }
    const created = await this.content.createContentVersion({ versionId: editedVersionId }, actor);
    if (!created) {
      throw new ParamsError('Failed to create version');
    }
    return this.get(created.id, contentId, projectId, {});
  }

  /**
   * Restore a historical version: fork it forward as the new edited (head)
   * version — config / data / theme / steps copied from version `id`. Binds the
   * same domain method the builder uses. Returns the new version.
   */
  async restore(
    id: string,
    contentId: string,
    projectId: string,
    actor?: WriteActor,
  ): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (
      !version ||
      (version as { contentId?: string }).contentId !== contentId ||
      (version.content as { deleted?: boolean } | null)?.deleted
    ) {
      throw new ContentNotFoundError();
    }
    const created = await this.content.restoreContentVersion(id, actor);
    if (!created) {
      throw new ParamsError('Failed to restore version');
    }
    return this.get(created.id, contentId, projectId, {});
  }

  /**
   * Batch target-type check for the cross-content references the write walk
   * collected. Every reference — a content-state condition, a start_content
   * action, a resource-center content-list item — must point at a FLOW or a
   * CHECKLIST (the only types the builder lets you pick; only those record the
   * per-user state / can be launched). A wrong-type reference would publish and
   * silently never fire, so it's a deterministic write-time error; the
   * existence/dangling-id half is forward-ref-tolerant and stays a validate
   * warning in collectRuleIssues. Unknown / cross-project ids are left to that
   * existence check.
   */
  private async contentReferenceIssues(
    refs: ContentReference[],
    projectId: string,
  ): Promise<ValidationIssue[]> {
    if (refs.length === 0) {
      return [];
    }
    const ids = [...new Set(refs.map((r) => r.id))];
    const found = await this.prisma.content.findMany({
      where: { id: { in: ids }, projectId },
      select: { id: true, type: true },
    });
    const typeById = new Map(found.map((c) => [c.id, c.type]));
    const issues: ValidationIssue[] = [];
    for (const r of refs) {
      const targetType = typeById.get(r.id);
      if (targetType && !CONTENT_REFERENCE_TARGET_TYPE_SET.has(targetType)) {
        issues.push({
          rule: 'reference_target',
          path: r.path,
          message: `${r.kind} (in ${r.where}) references a ${targetType}, but it can only reference a flow or a checklist. Point it at a flow or checklist instead.`,
        });
      }
    }
    return issues;
  }

  async update(
    id: string,
    contentId: string,
    projectId: string,
    body: UpdateVersionBody,
    actor?: WriteActor,
  ): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    // One catalog load builds both directions: `compile` for this write, `decompile`
    // for the read-back response (passed into get() below so it doesn't re-load).
    const { compile: resolvers, decompile } = await loadResolvers(this.prisma, projectId);
    const content: Record<string, unknown> = {};
    const contentType =
      (version as { content?: { type?: string | null } | null }).content?.type ?? undefined;

    // ── Contract validation: ONE walk over steps / data / start / hide rules that
    // collects EVERY violation (reactive slots, per-type actions, step shape) plus
    // the cross-content references; per-type auto-start knobs and the reference
    // target types are folded in, then everything is rejected in a single E1017
    // whose `issues[]` lists each problem with its rule family and path — so a
    // client fixes the whole request in one round-trip.
    const { issues, refs } = collectWriteViolations({
      steps: body.steps,
      data: body.data,
      startRules: body.startRules ?? undefined,
      hideRules: body.hideRules ?? undefined,
      contentType,
    });
    if (body.startRules !== undefined || body.hideRules !== undefined) {
      issues.push(
        ...validateAutoStartForType(body.startRules, body.hideRules, contentType).map(
          (message) => ({ rule: 'auto_start' as const, message }),
        ),
      );
    }
    // A settings-only startRules patch (no `when`) is only meaningful when
    // auto-start is already enabled on this version. Otherwise the settings
    // land in storage but the read side keys off the enabled flag — they'd be
    // stored dead AND invisible (the caller sees startRules: null and assumes
    // the write was lost). Refuse instead of silently swallowing.
    if (
      body.startRules &&
      body.startRules.when === undefined &&
      !(version as { config?: { enabledAutoStartRules?: boolean } | null }).config
        ?.enabledAutoStartRules
    ) {
      issues.push({
        rule: 'auto_start' as const,
        message:
          'startRules without `when` only patches settings, but auto-start is not enabled on ' +
          'this version — include `when` to enable it (the settings would otherwise be stored ' +
          'dead and read back as null)',
      });
    }
    issues.push(...(await this.contentReferenceIssues(refs, projectId)));
    if (issues.length > 0) {
      throw ValidationError.fromIssues(issues);
    }
    const refuseUnresolvedCodes = () => {
      // Segment writes have always refused unknown attribute/event codes
      // (assertConditionsValid); the version write compiled them into attrId
      // as the raw codeName — a dead condition the read side then reports as
      // "references a deleted attribute". Same standard here: draft leniency
      // tolerates INCOMPLETE content, not never-resolvable references.
      const misses = [...new Set(resolvers.misses ?? [])];
      if (misses.length) {
        throw new ValidationError(
          `Conditions reference unknown definitions: ${misses.join(', ')}. Create them first or fix the codeName.`,
        );
      }
    };

    if (body.steps) {
      // Per-step theme overrides must reference a live project theme (a null clears
      // the override → inherit the version theme, so only validate non-null strings).
      // Distinct overrides are independent reads, so check them concurrently.
      await Promise.all(
        [
          ...new Set(
            body.steps.map((s) => s.themeId).filter((t): t is string => typeof t === 'string'),
          ),
        ].map((themeId) => this.themes.requireTheme(themeId, projectId)),
      );

      // Steps merge by handle (echo to update, omit to create). The primary `id`
      // is the default key, but it is regenerated on fork (create_content_version)
      // while the `cvid` is preserved — so accept either, preferring `id`, and keep
      // the matched step's cvid (or the caller's cvid for a fresh one). This lets an
      // agent edit a just-forked version by the stable cvid it already knows, with
      // no read-back to learn the new ids.
      const existingSteps = (version.steps ?? []) as {
        id: string;
        cvid?: string;
        data?: unknown;
        target?: unknown;
        setting?: unknown;
      }[];
      const existingById = new Map(existingSteps.map((s) => [s.id, s]));
      const existingByCvid = new Map(
        existingSteps.filter((s) => s.cvid).map((s) => [s.cvid as string, s]),
      );

      // Fix every step's cvid BEFORE compiling any content, so a `goto_step` can
      // reference a step by the author `key` it carries in this same write (or by
      // an existing cvid). Those references resolve to the real cvid here — no
      // read-back round-trip, and forward/cyclic links work in one pass.
      const planned = body.steps.map((s, i) => {
        // Match by id first, then cvid — falling back on a MISS, not on the
        // absence of id. A fork (create_content_version) regenerates every step
        // id but preserves cvid, so a caller echoing a forked version carries a
        // stale id AND a valid cvid; keying on `s.id ? byId : byCvid` would take
        // the id branch, miss, and treat every step as new (dropping the originals
        // in the wholesale upsert). The `??` retries cvid when the id lookup fails.
        const existing =
          (s.id ? existingById.get(s.id) : undefined) ??
          (s.cvid ? existingByCvid.get(s.cvid) : undefined);
        return {
          input: s,
          existing,
          // cvid stays server-owned: reuse the matched step's, otherwise mint a
          // fresh one (an unmatched caller cvid is treated as a new step, like id).
          cvid: existing?.cvid ?? cuid(),
          sequence: s.sequence ?? i,
        };
      });

      // One handle→cvid table: every step answers to its own cvid; a step with a
      // `key` also answers to that key (key wins if it ever collides with a cvid).
      const knownCvids = new Set<string>([
        ...planned.map((p) => p.cvid),
        ...((version.steps ?? []) as { cvid?: string }[])
          .map((s) => s.cvid)
          .filter((c): c is string => Boolean(c)),
      ]);
      const keyToCvid = new Map<string, string>();
      for (const p of planned) {
        const key = (p.input as { key?: string }).key;
        if (!key) continue;
        if (keyToCvid.has(key)) {
          throw new ValidationError(`Duplicate step key "${key}" in this request.`);
        }
        if (knownCvids.has(key)) {
          throw new ValidationError(`Step key "${key}" must not equal an existing step cvid.`);
        }
        keyToCvid.set(key, p.cvid);
      }
      const stepResolvers: CompileResolvers = {
        ...resolvers,
        stepCvid: (ref: string) => {
          const byKey = keyToCvid.get(ref);
          if (byKey) {
            return byKey;
          }
          if (knownCvids.has(ref)) {
            return ref;
          }
          throw new ValidationError(
            `"go to step" references unknown step "${ref}" — use a step \`key\` from this request or an existing step cvid.`,
          );
        },
      };

      content.steps = planned.map((p) =>
        compileStep(
          { ...p.input, cvid: p.cvid, sequence: p.sequence, content: p.input.content ?? [] },
          p.existing,
          stepResolvers,
        ),
      );
    }

    if (body.startRules !== undefined || body.hideRules !== undefined) {
      const config = { ...(((version as { config?: unknown }).config as object) ?? {}) };
      if (body.startRules === null) {
        // A null CLEAR wipes the WHOLE start config — conditions AND settings.
        // Leaving autoStartRulesSetting behind looked cleared on read (the read
        // keys off enabled/rules) but the stale wait/startIfNotComplete/priority
        // resurrected on the next startRules write after a fork — a real
        // acceptance-eval defect (flow round, F3).
        Object.assign(config, { enabledAutoStartRules: false, autoStartRules: [] });
        // `undefined` drops the key when the JSON column serializes — no residue.
        (config as { autoStartRulesSetting?: unknown }).autoStartRulesSetting = undefined;
      } else if (body.startRules !== undefined) {
        const compiled = compileStartRules(body.startRules, resolvers) as {
          autoStartRulesSetting?: Record<string, unknown>;
        } & Record<string, unknown>;
        // The start-rule SETTING (frequency / priority / wait / startIfNotComplete) is a
        // PARTIAL patch: compileStartRules emits only the fields the caller supplied, so
        // merge them onto the existing setting rather than replacing it wholesale —
        // otherwise sending `frequency` alone would silently drop a stored `priority`.
        // `when` is a full replace WHEN PRESENT; omitted, compileStartRules emits no
        // condition keys and the stored conditions survive (settings-only patch).
        const existingSetting =
          (config as { autoStartRulesSetting?: Record<string, unknown> }).autoStartRulesSetting ??
          {};
        Object.assign(config, compiled);
        const mergedSetting = { ...existingSetting, ...(compiled.autoStartRulesSetting ?? {}) };
        if (Object.keys(mergedSetting).length > 0) {
          (config as { autoStartRulesSetting?: unknown }).autoStartRulesSetting = mergedSetting;
        }
      }
      if (body.hideRules !== undefined) {
        Object.assign(config, compileHideRules(body.hideRules, resolvers));
      }
      content.config = config;
    }

    if (body.themeId !== undefined) {
      await this.themes.requireTheme(body.themeId, projectId);
      content.themeId = body.themeId;
    }

    if (body.scheduledAt !== undefined) {
      // The "announcement time" only means something on the announcement feed
      // (visibility gate + ordering key); on any other type it would be a silent
      // no-op stored on the row — reject instead of accepting dead input.
      if (contentType !== ContentDataType.ANNOUNCEMENT) {
        throw new ValidationError('scheduledAt is only supported on announcement versions.');
      }
      content.scheduledAt = body.scheduledAt === null ? null : new Date(body.scheduledAt);
    }

    if (body.data !== undefined) {
      if (!contentType) {
        throw new ParamsError('Cannot resolve content type for this version');
      }
      content.data = compileVersionData(
        contentType,
        body.data,
        (version as { data?: unknown }).data,
        resolvers,
      );
    }

    // All compiles are done — refuse if any condition referenced an unknown code.
    refuseUnresolvedCodes();

    if (Object.keys(content).length > 0) {
      const result = await this.content.updateContentVersion(
        {
          versionId: id,
          content: content as never,
        },
        actor,
      );
      if (!result) {
        throw new ParamsError('Version is not editable');
      }
    }

    // Echo BOTH steps (flow) and data (checklist/launcher/banner/tracker/
    // resource-center) so the write response confirms what was persisted in one
    // round-trip — a flow has no `data` and a non-flow has empty `steps`, so the
    // mapper just omits the irrelevant one.
    return this.get(id, contentId, projectId, { expand: ['steps', 'data'] }, decompile);
  }

  /**
   * Dry-run usability check — the same validation `publish` enforces, but
   * non-mutating, so an agent can confirm a draft is renderable before shipping
   * (the machine equivalent of the builder's live preview).
   */
  async validate(id: string, contentId: string, projectId: string): Promise<UsabilityReport> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const v = version as {
      themeId: string | null;
      steps?: unknown;
      data?: unknown;
      config?: unknown;
      content?: { type?: string };
    };
    return validateVersionUsable({
      type: v.content?.type ?? ContentDataType.FLOW,
      themeId: v.themeId,
      steps: v.steps as Step[],
      data: v.data,
      config: v.config as { autoStartRules?: RulesCondition[] } | null,
      conditionContext: await loadConditionContext(this.prisma, projectId),
    });
  }
}
