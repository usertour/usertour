import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import {
  AttributeDefinitionNotFoundError,
  ContentNotFoundError,
  EventDefinitionNotFoundError,
  SegmentNotFoundError,
  ThemeNotFoundError,
} from '@/common/errors/errors';

/**
 * Reverse-reference lookup: "who is still using this attribute / event / theme /
 * segment / content?" — the read that makes the delete tools' blast-radius
 * warnings actionable (they could only say "rewire references BEFORE deleting";
 * finding those references meant reading every content by hand, which an
 * auditor measured as feasible at 17 contents and hopeless at 100).
 *
 * Scan-on-demand, no bookkeeping table: maintaining a reference index on every
 * write adds write-path complexity and a drift risk for a read that happens
 * rarely (same reasoning that rejected the materialized reachability graph).
 * The scan surfaces are the LIVE ones — each content's edited version plus its
 * published versions, segment definitions, and theme variations. A match inside
 * an old historical version is not a live reference.
 *
 * Precision: stored conditions carry INTERNAL ids (`attrId` / `eventId` /
 * `segmentId` / `contentId` keys), so matching is by exact key+value — never a
 * text search. The one duality: a question's attribute binding stores the
 * CODENAME (`selectedAttribute`), so attribute lookups match both vocabularies.
 * A coarse jsonb::text LIKE prefilter shortlists version rows first (it can
 * only over-select; the precise walk decides), so the common case loads little.
 *
 * Deliberately out of scope: `{{ codeName }}` liquid mentions in text (display
 * bindings that render empty, not references), and historical versions.
 */

export type ReferenceTargetKind = 'attribute' | 'event' | 'segment' | 'theme' | 'content';

export interface ReferenceRow {
  /** What kind of object holds the reference. */
  referrerKind: 'content' | 'segment' | 'theme';
  id: string;
  name: string;
  /** Present when referrerKind === 'content'. */
  contentType?: string;
  /** Human-readable spots, deduped — e.g. "start rules (draft)", "step 2 trigger (published)". */
  where: string[];
}

type VersionRole = 'draft' | 'published' | 'draft+published';

@Injectable()
export class ApiReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async listReferences(
    projectId: string,
    kind: ReferenceTargetKind,
    targetId: string,
  ): Promise<{ referrers: ReferenceRow[]; codeName?: string }> {
    // Resolve the target FIRST, and refuse an unknown/foreign id with the
    // kind's own not-found code. This tool's whole purpose is the pre-delete
    // safety check — an empty result for a mistyped id read as an
    // authoritative "nothing references this, safe to delete", which is the
    // exact wrong direction to fail in (read-only-credential audit).
    let codeName: string | undefined;
    if (kind === 'attribute') {
      const attr = await this.prisma.attribute.findFirst({
        where: { id: targetId, projectId },
        select: { codeName: true },
      });
      if (!attr) throw new AttributeDefinitionNotFoundError();
      codeName = attr.codeName;
    } else if (kind === 'event') {
      const ev = await this.prisma.event.findFirst({
        where: { id: targetId, projectId },
        select: { codeName: true },
      });
      if (!ev) throw new EventDefinitionNotFoundError();
      codeName = ev.codeName;
    } else if (kind === 'segment') {
      const seg = await this.prisma.segment.findFirst({
        where: { id: targetId, projectId },
        select: { id: true },
      });
      if (!seg) throw new SegmentNotFoundError();
    } else if (kind === 'theme') {
      const theme = await this.prisma.theme.findFirst({
        where: { id: targetId, projectId, deleted: false },
        select: { id: true },
      });
      if (!theme) throw new ThemeNotFoundError();
    } else if (kind === 'content') {
      const content = await this.prisma.content.findFirst({
        where: { id: targetId, projectId, deleted: false },
        select: { id: true },
      });
      if (!content) throw new ContentNotFoundError();
    }

    const contents = await this.prisma.content.findMany({
      where: { projectId, deleted: false },
      select: {
        id: true,
        name: true,
        type: true,
        editedVersionId: true,
        contentOnEnvironments: { select: { publishedVersionId: true } },
      },
    });
    const editedIds = new Set(contents.map((c) => c.editedVersionId).filter(Boolean) as string[]);
    const publishedIds = new Set(
      contents.flatMap((c) => c.contentOnEnvironments.map((e) => e.publishedVersionId)),
    );
    const liveVersionIds = [...new Set([...editedIds, ...publishedIds])];
    const contentByVersion = new Map<string, (typeof contents)[number]>();
    for (const c of contents) {
      if (c.editedVersionId) contentByVersion.set(c.editedVersionId, c);
      for (const e of c.contentOnEnvironments) contentByVersion.set(e.publishedVersionId, c);
    }

    const rows = new Map<string, ReferenceRow>();
    const addHit = (
      referrerKind: ReferenceRow['referrerKind'],
      id: string,
      name: string,
      where: string,
      contentType?: string,
    ) => {
      const key = `${referrerKind}:${id}`;
      const row = rows.get(key) ?? { referrerKind, id, name, contentType, where: [] };
      if (!row.where.includes(where)) row.where.push(where);
      rows.set(key, row);
    };
    const roleOf = (versionId: string): VersionRole => {
      const edited = editedIds.has(versionId);
      const published = publishedIds.has(versionId);
      return edited && published ? 'draft+published' : edited ? 'draft' : 'published';
    };

    // ── Theme: plain foreign-key columns, exact queries, no JSON walk ─────────
    if (kind === 'theme') {
      if (liveVersionIds.length > 0) {
        const [versions, steps] = await Promise.all([
          this.prisma.version.findMany({
            where: { id: { in: liveVersionIds }, themeId: targetId },
            select: { id: true },
          }),
          this.prisma.step.findMany({
            where: { versionId: { in: liveVersionIds }, themeId: targetId },
            select: { versionId: true, sequence: true },
          }),
        ]);
        for (const v of versions) {
          const c = contentByVersion.get(v.id);
          if (c) addHit('content', c.id, c.name ?? '', `version theme (${roleOf(v.id)})`, c.type);
        }
        for (const s of steps) {
          const c = contentByVersion.get(s.versionId);
          if (c)
            addHit(
              'content',
              c.id,
              c.name ?? '',
              `step ${s.sequence + 1} theme override (${roleOf(s.versionId)})`,
              c.type,
            );
        }
      }
      return { referrers: [...rows.values()] };
    }

    // ── JSON-borne references: coarse LIKE prefilter, then a precise walk ─────
    const needles = [targetId, ...(kind === 'attribute' && codeName ? [codeName] : [])];
    const matchesLeaf = (key: string, value: unknown): boolean => {
      if (typeof value !== 'string') return false;
      switch (kind) {
        case 'attribute':
          if (key === 'attrId') return value === targetId;
          // Question bindings store the CODENAME, not the id.
          if (key === 'selectedAttribute') return value === codeName;
          return false;
        case 'event':
          return key === 'eventId' && value === targetId;
        case 'segment':
          return key === 'segmentId' && value === targetId;
        case 'content':
          return key === 'contentId' && value === targetId;
        default:
          return false;
      }
    };
    const walk = (node: unknown, onHit: (path: string[]) => void, path: string[] = []): void => {
      if (Array.isArray(node)) {
        node.forEach((n, i) => walk(n, onHit, [...path, String(i)]));
        return;
      }
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (matchesLeaf(key, value)) onHit([...path, key]);
        else walk(value, onHit, [...path, key]);
      }
    };
    const label = (
      surface: 'config' | 'data' | 'step',
      path: string[],
      stepSeq?: number,
    ): string => {
      if (surface === 'config') {
        if (path[0] === 'autoStartRules') return 'start rules';
        if (path[0] === 'hideRules') return 'hide rules';
        return 'version settings';
      }
      if (surface === 'step') {
        const inTrigger = path[0] === 'trigger';
        const isBinding = path[path.length - 1] === 'selectedAttribute';
        const stepNo = `step ${(stepSeq ?? 0) + 1}`;
        if (isBinding) return `${stepNo} question binding`;
        return inTrigger ? `${stepNo} trigger` : `${stepNo} content`;
      }
      return 'content body';
    };

    if (liveVersionIds.length > 0) {
      // Coarse shortlist: which live versions / steps even CONTAIN a needle.
      const likeClauses = needles.map((n) => `%${n}%`);
      const versionHits = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Version" v
        WHERE v.id IN (${Prisma.join(liveVersionIds)})
          AND (v.config::text LIKE ANY(ARRAY[${Prisma.join(likeClauses)}])
            OR v.data::text LIKE ANY(ARRAY[${Prisma.join(likeClauses)}]))`;
      const stepHits = await this.prisma.$queryRaw<{ versionId: string }[]>`
        SELECT DISTINCT s."versionId" FROM "Step" s
        WHERE s."versionId" IN (${Prisma.join(liveVersionIds)})
          AND (s.data::text LIKE ANY(ARRAY[${Prisma.join(likeClauses)}])
            OR s.trigger::text LIKE ANY(ARRAY[${Prisma.join(likeClauses)}]))`;
      const shortlist = [
        ...new Set([...versionHits.map((v) => v.id), ...stepHits.map((s) => s.versionId)]),
      ];

      if (shortlist.length > 0) {
        const versions = await this.prisma.version.findMany({
          where: { id: { in: shortlist } },
          select: {
            id: true,
            config: true,
            data: true,
            steps: {
              select: { sequence: true, data: true, trigger: true },
              orderBy: { sequence: 'asc' },
            },
          },
        });
        for (const v of versions) {
          const c = contentByVersion.get(v.id);
          if (!c || (kind === 'content' && c.id === targetId)) continue;
          const role = roleOf(v.id);
          walk(v.config, (p) =>
            addHit('content', c.id, c.name ?? '', `${label('config', p)} (${role})`, c.type),
          );
          walk(v.data, (p) =>
            addHit('content', c.id, c.name ?? '', `${label('data', p)} (${role})`, c.type),
          );
          for (const s of v.steps) {
            walk(s.data, (p) =>
              addHit(
                'content',
                c.id,
                c.name ?? '',
                `${label('step', p, s.sequence)} (${role})`,
                c.type,
              ),
            );
            walk(s.trigger, (p) =>
              addHit(
                'content',
                c.id,
                c.name ?? '',
                `${label('step', ['trigger', ...p], s.sequence)} (${role})`,
                c.type,
              ),
            );
          }
        }
      }
    }

    // ── Segment definitions reference attributes ──────────────────────────────
    if (kind === 'attribute') {
      const segments = await this.prisma.segment.findMany({
        where: { projectId },
        select: { id: true, name: true, data: true },
      });
      for (const seg of segments) {
        walk(seg.data, () => addHit('segment', seg.id, seg.name ?? '', 'segment conditions'));
      }
    }

    // ── Theme variations reference attributes / segments ──────────────────────
    if (kind === 'attribute' || kind === 'segment') {
      const themes = await this.prisma.theme.findMany({
        where: { projectId, deleted: false },
        select: { id: true, name: true, variations: true },
      });
      for (const t of themes) {
        walk(t.variations, () => addHit('theme', t.id, t.name ?? '', 'theme variation conditions'));
      }
    }

    return { referrers: [...rows.values()], codeName };
  }
}
