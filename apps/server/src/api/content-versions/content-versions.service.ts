import { Injectable } from '@nestjs/common';
import { cuid } from '@usertour/helpers';
import { ContentDataType, StepContentType } from '@usertour/types';
import type { RulesCondition, Step } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  ParamsError,
  ThemeNotFoundError,
  ValidationError,
} from '@/common/errors/errors';
import { ContentService } from '@/content/content.service';
import { ThemesService } from '@/themes/themes.service';

import { loadConditionContext } from '../content-representation/condition-context';
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
  buildCompileResolversFrom,
  buildDecompileResolversFrom,
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

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

type VersionNode = {
  id: string;
  sequence: number;
  themeId: string | null;
  config?: unknown;
  data?: unknown;
  content?: { type?: string | null } | null;
  updatedAt: Date;
  createdAt: Date;
};

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
    private readonly themes: ThemesService,
  ) {}

  async get(
    id: string,
    contentId: string,
    projectId: string,
    query: GetContentVersionQuery,
  ): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildResolvers(projectId);
    return this.toVersion(version, projectId, toArray(query.expand), resolvers);
  }

  async list(
    requestUrl: string,
    projectId: string,
    contentId: string,
    query: ListContentVersionsQuery,
  ): Promise<{ results: ContentVersion[]; next: string | null; previous: string | null }> {
    const { limit, cursor } = query;
    const expand = toArray(query.expand);
    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    // Scope the existence check to the project so a foreign contentId is a 404,
    // not a 200-empty (which would leak cross-tenant content-id existence).
    const content = await this.content.findContentWithRelations(contentId, projectId, {});
    if (!content) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildResolvers(projectId);

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: expand.length ? { expand } : undefined,
      fetch: (params) =>
        this.content.listContentVersionsWithRelations(
          projectId,
          contentId,
          params,
          { content: true },
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
    const rules = {
      ...(decompileStartRules(version.config, resolvers)
        ? { startRules: decompileStartRules(version.config, resolvers) }
        : {}),
      ...(decompileHideRules(version.config, resolvers)
        ? { hideRules: decompileHideRules(version.config, resolvers) }
        : {}),
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
    const steps = await this.loadSteps(version.id, projectId);
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

  /** Map internal attribute / event ids to their stable codeName (read fallback: the id). */
  private async buildResolvers(projectId: string): Promise<DecompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true, bizType: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    return buildDecompileResolversFrom(attributes, events);
  }

  /**
   * Write a draft version: compile the representation steps + rules and field-merge
   * them onto the existing internal version, then delegate persistence to the
   * domain `updateContentVersion` (the builder's exact path — cvid upsert in a
   * transaction). Only the provided fields are touched.
   */
  /**
   * Fork a new draft version from the content's current edited version (the
   * builder's "new version" action): the fork becomes the new editedVersion, the
   * previous draft is frozen as a historical version.
   */
  async create(projectId: string, contentId: string): Promise<ContentVersion> {
    const content = await this.content.findContentWithRelations(contentId, projectId, {});
    if (!content || (content as { deleted?: boolean }).deleted) {
      throw new ContentNotFoundError();
    }
    const editedVersionId = (content as { editedVersionId?: string | null }).editedVersionId;
    if (!editedVersionId) {
      throw new ParamsError('Content has no editable version to fork');
    }
    const created = await this.content.createContentVersion({ versionId: editedVersionId });
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
  async restore(id: string, contentId: string, projectId: string): Promise<ContentVersion> {
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
    const created = await this.content.restoreContentVersion(id);
    if (!created) {
      throw new ParamsError('Failed to restore version');
    }
    return this.get(created.id, contentId, projectId, {});
  }

  /**
   * Reactive condition slots — a step's `triggers[].when` and a button block's
   * `hiddenWhen` / `disabledWhen` — are evaluated LIVE in the browser (the SDK
   * polls the DOM). The builder omits `event` / `segment` / `flow`-state from these
   * slots because those are server-evaluated and would silently never fire here.
   * The general condition union (accepted by this write API) allows them, so gate
   * it: reject those types in these slots at write, and point authors to start/hide
   * rules or a checklist item's completeWhen (which ARE server-evaluated) instead.
   */
  private assertStepReactiveConditions(steps: unknown[]): void {
    steps.forEach((s, i) => {
      const step = s as { triggers?: { when?: unknown }[]; content?: unknown };
      (step.triggers ?? []).forEach((t, ti) =>
        this.assertReactiveConditions(
          t?.when,
          `steps[${i}].triggers[${ti}].when`,
          'a step trigger',
        ),
      );
      this.assertButtonReactiveConditions(step.content, `steps[${i}].content`);
    });
  }

  private assertButtonReactiveConditions(blocks: unknown, path: string): void {
    if (!Array.isArray(blocks)) return;
    blocks.forEach((b, i) => {
      const block = b as {
        type?: string;
        hiddenWhen?: unknown;
        disabledWhen?: unknown;
        columns?: { blocks?: unknown }[];
      };
      const at = `${path}[${i}]`;
      if (block?.type === 'button') {
        const slot = 'a button show/hide/disable rule';
        this.assertReactiveConditions(block.hiddenWhen, `${at}.hiddenWhen`, slot);
        this.assertReactiveConditions(block.disabledWhen, `${at}.disabledWhen`, slot);
      }
      if (block?.type === 'columns' && Array.isArray(block.columns)) {
        block.columns.forEach((col, ci) =>
          this.assertButtonReactiveConditions(col?.blocks, `${at}.columns[${ci}].blocks`),
        );
      }
    });
  }

  private assertReactiveConditions(conditions: unknown, path: string, slot: string): void {
    if (!Array.isArray(conditions)) return;
    const EXCLUDED = new Set(['event', 'segment', 'flow']);
    conditions.forEach((c, i) => {
      const at = `${path}[${i}]`;
      const type = (c as { type?: unknown })?.type;
      if (typeof type === 'string' && EXCLUDED.has(type)) {
        throw new ValidationError(
          `A "${type}" condition can't be used in ${slot} (at ${at}) — that is evaluated live in the browser and supports only attribute / current_url / element / text_input / text_filled / time conditions. Event / segment / flow-state conditions are server-evaluated and aren't supported here.`,
        );
      }
      if (type === 'group') {
        this.assertReactiveConditions(
          (c as { conditions?: unknown }).conditions,
          `${at}.conditions`,
          slot,
        );
      }
    });
  }

  /**
   * Walk a non-flow content body (checklist / launcher / banner / resource-center) and reject
   * inputs the general write schema accepts but the builder never offers and the runtime can't
   * honour on these content types:
   *  - `goto_step` actions anywhere: goto_step navigates between the STEPS of a flow; a non-flow
   *    content type has no steps, so the builder omits it and the runtime leaves it inert / dangling.
   *  - button `hiddenWhen` / `disabledWhen` reactive conditions referencing server-evaluated types
   *    (event / segment / flow-state): the builder restricts these show/hide/disable rules to
   *    client-polled types, and the runtime never re-checks server types mid-session, so the button
   *    would fail open (always shown / enabled). This is the body.data counterpart of the flow-step
   *    guard `assertStepReactiveConditions` (which only covers body.steps).
   * checklist `completeWhen` intentionally allows the full condition set, so it is NOT touched here —
   * only button hiddenWhen/disabledWhen carry the reactive-slot restriction.
   */
  private assertNonFlowData(data: unknown, contentType: string, slotHint: string): void {
    // resource-center has no dismiss action handler (the builder registers dismiss only for
    // flow / checklist / banner / launcher), so a `dismiss` in an RC action compiles to the
    // default flow-dismiss and silently no-ops in the RC renderer.
    const rejectDismiss = contentType === ContentDataType.RESOURCE_CENTER;
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((n, i) => walk(n, `${path}[${i}]`));
        return;
      }
      if (!node || typeof node !== 'object') {
        return;
      }
      const obj = node as Record<string, unknown>;
      if (obj.type === 'goto_step') {
        throw new ValidationError(
          `A "goto_step" action can't be used in ${slotHint} (at ${path}). goto_step navigates between the steps of a flow, and this content type has no steps — use start_flow, page_navigate, or dismiss instead.`,
        );
      }
      if (rejectDismiss && obj.type === 'dismiss') {
        throw new ValidationError(
          `A "dismiss" action can't be used in ${slotHint} (at ${path}). A resource center has no dismiss action — use start_flow or page_navigate, or let its built-in close button dismiss it.`,
        );
      }
      if (obj.type === 'button') {
        this.assertReactiveConditions(
          obj.hiddenWhen,
          `${path}.hiddenWhen`,
          "a button's show/hide rule",
        );
        this.assertReactiveConditions(
          obj.disabledWhen,
          `${path}.disabledWhen`,
          "a button's enable/disable rule",
        );
      }
      for (const key of Object.keys(obj)) {
        walk(obj[key], `${path}.${key}`);
      }
    };
    walk(data, 'data');
  }

  /**
   * Per-step shape checks the general step schema is too loose to enforce:
   *  - placement shape must match the step kind. The placement union is non-discriminated,
   *    so the schema accepts a tooltip-shape `{side,align}` on a modal (renders centered,
   *    side/align dropped) or a modal-shape `{position}` on a tooltip (renders by side/align,
   *    position dropped). Require tooltip→`{side,align}` and modal→`{position}`. bubble is
   *    positioned by its theme (step placement is ignored by design) and hidden has no UI, so
   *    neither is shape-checked.
   *  - onClick (click-the-target-element to advance) only fires on a tooltip, which anchors to
   *    a target element; on a modal / bubble / hidden step there is no target to click, so the
   *    action silently never runs. An empty onClick (clearing the actions) is allowed anywhere.
   */
  private assertStepShape(steps: unknown[]): void {
    steps.forEach((step, i) => {
      if (!step || typeof step !== 'object') {
        return;
      }
      const s = step as Record<string, unknown>;
      const type = s.type;
      const at = `steps[${i}]`;
      const placement = s.placement as Record<string, unknown> | undefined;
      if (placement && typeof placement === 'object') {
        const isTooltipShape = 'side' in placement;
        const isModalShape = 'position' in placement;
        if (type === StepContentType.TOOLTIP && isModalShape) {
          throw new ValidationError(
            `A tooltip step (${at}) needs a tooltip placement { side, align } anchored to its target — it can't use a modal placement { position }, which would be ignored.`,
          );
        }
        if (type === StepContentType.MODAL && isTooltipShape) {
          throw new ValidationError(
            `A modal step (${at}) needs a modal placement { position } on the viewport grid — it can't use a tooltip placement { side, align }, which would be ignored.`,
          );
        }
      }
      const onClick = s.onClick;
      if (Array.isArray(onClick) && onClick.length > 0 && type !== StepContentType.TOOLTIP) {
        throw new ValidationError(
          `onClick (click the target element to advance) only works on a tooltip step; a ${String(
            type,
          )} step (${at}) has no target element to click, so the action would never fire. Use a step trigger or a button action instead.`,
        );
      }
    });
  }

  /**
   * A content-state ("content" / representation `flow`) condition gates on another piece of
   * content's per-user state (seen / completed / active). Only FLOWS and CHECKLISTS carry that
   * state — the builder's picker lists only flows and checklists here, and the runtime records
   * seen/completed events only for them (FLOW_STEP_SEEN / CHECKLIST_SEEN, FLOW_COMPLETED /
   * CHECKLIST_COMPLETED). A banner / launcher / resource-center / tracker can't be a target: on
   * those a seen/completed condition silently never matches and active/inactive isn't authorable
   * in the builder, so referencing one is rejected for ANY state. Reactive slots (step triggers,
   * button show/hide) already reject all content-state conditions, so only start / hide rules and
   * non-flow `data` slots reach here. Unknown / cross-project target ids are left to other
   * validation — only a real content of the wrong type is flagged.
   */
  private async assertFlowStateTargets(body: UpdateVersionBody, projectId: string): Promise<void> {
    const VALID_TARGET_TYPES = new Set<string>([ContentDataType.FLOW, ContentDataType.CHECKLIST]);
    const refs: { flow: string; where: string }[] = [];
    const collect = (node: unknown, where: string): void => {
      if (Array.isArray(node)) {
        for (const n of node) {
          collect(n, where);
        }
        return;
      }
      if (!node || typeof node !== 'object') {
        return;
      }
      const obj = node as Record<string, unknown>;
      if (obj.type === 'flow' && typeof obj.flow === 'string') {
        refs.push({ flow: obj.flow, where });
      }
      for (const key of Object.keys(obj)) {
        collect(obj[key], where);
      }
    };
    collect(body.startRules?.when, 'a start rule');
    collect(body.hideRules?.when, 'a hide rule');
    collect(body.data, "the content's data");
    if (refs.length === 0) {
      return;
    }

    const ids = [...new Set(refs.map((r) => r.flow))];
    const found = await this.prisma.content.findMany({
      where: { id: { in: ids }, projectId },
      select: { id: true, type: true },
    });
    const typeById = new Map(found.map((c) => [c.id, c.type]));
    for (const r of refs) {
      const targetType = typeById.get(r.flow);
      if (targetType && !VALID_TARGET_TYPES.has(targetType)) {
        throw new ValidationError(
          `A content-state condition (in ${r.where}) references a ${targetType}, but these conditions can only track a flow or a checklist (only those record per-user seen/completed/active state). Reference a flow or checklist instead.`,
        );
      }
    }
  }

  async update(
    id: string,
    contentId: string,
    projectId: string,
    body: UpdateVersionBody,
  ): Promise<ContentVersion> {
    const version = await this.content.getContentVersionWithRelations(id, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const resolvers = await this.buildCompileResolvers(projectId);
    const content: Record<string, unknown> = {};

    // A content-state condition can only track a flow or checklist (the builder lists only
    // those; banner/launcher/RC/tracker carry no per-user seen/completed state) — reject before
    // compiling.
    await this.assertFlowStateTargets(body, projectId);

    if (body.steps) {
      // Reactive slots (step triggers + button show/hide/disable) only support
      // client-evaluable conditions — reject event/segment/flow-state up front (the
      // builder omits them there and they'd silently never fire; those belong in
      // start/hide rules or a checklist item's completeWhen).
      this.assertStepReactiveConditions(body.steps as unknown[]);
      // Placement shape + onClick must match the step kind: the placement union is
      // non-discriminated, so a tooltip given a modal-shape `{position}` (or a modal given
      // a tooltip-shape `{side,align}`) would silently drop the wrong-shape fields, and an
      // onClick (click-the-target-to-advance) on a targetless step never fires.
      this.assertStepShape(body.steps as unknown[]);
      // Per-step theme overrides must reference a live project theme (a null clears
      // the override → inherit the version theme, so only validate non-null strings).
      for (const themeId of new Set(
        body.steps.map((s) => s.themeId).filter((t): t is string => typeof t === 'string'),
      )) {
        await this.requireTheme(themeId, projectId);
      }

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
        const existing = s.id
          ? existingById.get(s.id)
          : s.cvid
            ? existingByCvid.get(s.cvid)
            : undefined;
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
          throw new ValidationError(`Step key "${key}" must not equal an existing step id.`);
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
      // Enforce the per-type auto-start contract the builder enforces by hiding
      // controls — the API/MCP must reject settings the content type can't use
      // (e.g. a frequency on a launcher), not silently accept them.
      const contentType = (version as { content?: { type?: string | null } | null }).content?.type;
      const violations = validateAutoStartForType(
        body.startRules,
        body.hideRules,
        contentType ?? undefined,
      );
      if (violations.length > 0) {
        throw new ValidationError(violations.join(' '));
      }
      // A tracker fires its event when its start conditions match — evaluated live
      // in the browser (client-driven), so (matching the builder's tracker editor)
      // its conditions can't be server-side event / segment / flow-state. Other
      // types' start/hide rules ARE server-evaluated and accept the full union.
      if (contentType === ContentDataType.TRACKER) {
        this.assertReactiveConditions(
          body.startRules?.when,
          'startRules.when',
          "a tracker's start conditions",
        );
      }
      const config = { ...(((version as { config?: unknown }).config as object) ?? {}) };
      if (body.startRules !== undefined) {
        Object.assign(config, compileStartRules(body.startRules ?? undefined, resolvers));
      }
      if (body.hideRules !== undefined) {
        Object.assign(config, compileHideRules(body.hideRules, resolvers));
      }
      content.config = config;
    }

    if (body.themeId !== undefined) {
      await this.requireTheme(body.themeId, projectId);
      content.themeId = body.themeId;
    }

    if (body.data !== undefined) {
      const contentType = (version as { content?: { type?: string | null } | null }).content?.type;
      if (!contentType) {
        throw new ParamsError('Cannot resolve content type for this version');
      }
      this.assertNonFlowData(body.data, contentType, `a ${contentType}'s content`);
      content.data = compileVersionData(
        contentType,
        body.data,
        (version as { data?: unknown }).data,
        resolvers,
      );
    }

    if (Object.keys(content).length > 0) {
      const result = await this.content.updateContentVersion({
        versionId: id,
        content: content as never,
      });
      if (!result) {
        throw new ParamsError('Version is not editable');
      }
    }

    // Echo BOTH steps (flow) and data (checklist/launcher/banner/tracker/
    // resource-center) so the write response confirms what was persisted in one
    // round-trip — a flow has no `data` and a non-flow has empty `steps`, so the
    // mapper just omits the irrelevant one.
    return this.get(id, contentId, projectId, { expand: ['steps', 'data'] });
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

  /** Assert a theme exists in the project (and is live) before writing it as themeId. */
  private async requireTheme(themeId: string, projectId: string): Promise<void> {
    const theme = await this.themes.getTheme(themeId);
    if (!theme || theme.projectId !== projectId || (theme as { deleted?: boolean }).deleted) {
      throw new ThemeNotFoundError();
    }
  }

  /** Map stable codes back to internal ids (code→id; fallback: the code itself). */
  private async buildCompileResolvers(projectId: string): Promise<CompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true, bizType: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    return buildCompileResolversFrom(attributes, events);
  }
}
