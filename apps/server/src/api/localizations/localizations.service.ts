import { Injectable } from '@nestjs/common';
import { ContentDataType } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  DefaultLocalizationCannotBeDeletedError,
  LocalizationNotFoundError,
  ResourceAlreadyExistsError,
  ResourceConflictError,
  ValidationError,
  type ValidationIssue,
} from '@/common/errors/errors';
import { isHttpUrl } from '@/common/url';
import { ContentService } from '@/content/content.service';
import { LocalizationsService } from '@/localizations/localizations.service';
import { UtilitiesService } from '@/utilities/utilities.service';

import { resolveStaleEmbeds } from '../content-representation/embed-resolve';
import { ApiObjectType } from '../shared/object-type';
import type {
  CreateLocalizationBody,
  ListLocalizationsQuery,
  UpdateLocalizationBody,
  UpdateVersionLocalizationBody,
  VersionLocalizationSummary,
} from './localizations.schema';
import {
  type StoredTranslation,
  type TranslationSource,
  applyTranslationUnits,
  isContentTypeLocalizable,
  isMediaUrlUnitPath,
  readTranslationUnits,
  summarizeTranslationUnits,
} from './version-translation';

/** Per-provider cap on an oEmbed lookup — same budget as the version write path. */
const OEMBED_TIMEOUT_MS = 5000;

interface LocalizationRow {
  id: string;
  code: string;
  name: string;
  locale: string;
  isDefault: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VersionLocalizationRow {
  localizationId: string;
  enabled: boolean;
  localized: unknown;
  backup: unknown;
  updatedAt: Date;
}

const toStored = (row: VersionLocalizationRow | undefined): StoredTranslation | undefined =>
  row ? { localized: row.localized, backup: row.backup } : undefined;

/**
 * v2 localizations handler. Two resources live here:
 *  - the project's locales — a settings-level resource (localization:*), managed
 *    through the same domain service the dashboard uses, so soft delete,
 *    restore-on-recreate and delivery-cache invalidation are shared;
 *  - each content version's translation per locale, as flat translation units
 *    (content:*). Persistence goes through the domain `upsertVersionLocalization`
 *    — the single write entry the dashboard saves through — so the editable-draft
 *    gate, the link schema stamp and the version touch all apply unchanged.
 */
@Injectable()
export class ApiLocalizationsService {
  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
    private readonly utilities: UtilitiesService,
    private readonly localizations: LocalizationsService,
  ) {}

  async list(projectId: string, query: ListLocalizationsQuery = {}) {
    const rows = await this.localizations.findMany(projectId, { deleted: query.deleted ?? false });
    // A project holds a handful of locales — one page, in the list envelope
    // every v2 collection uses.
    return { results: rows.map(this.mapLocalization), next: null, previous: null };
  }

  async create(projectId: string, body: CreateLocalizationBody) {
    try {
      const { localization, restored } = await this.localizations.createOrRestore({
        projectId,
        ...body,
      });
      return { ...this.mapLocalization(localization), restored };
    } catch (err) {
      throw this.toConflict(err);
    }
  }

  async update(id: string, projectId: string, body: UpdateLocalizationBody) {
    await this.requireLocalization(id, projectId, { deleted: false });
    try {
      return this.mapLocalization(await this.localizations.update({ id, ...body }));
    } catch (err) {
      throw this.toConflict(err);
    }
  }

  async delete(id: string, projectId: string): Promise<void> {
    const localization = await this.requireLocalization(id, projectId, { deleted: false });
    if (localization.isDefault) {
      throw new DefaultLocalizationCannotBeDeletedError();
    }
    await this.localizations.delete(id);
  }

  async restore(id: string, projectId: string) {
    await this.requireLocalization(id, projectId, { deleted: true });
    return this.mapLocalization(await this.localizations.restore(id));
  }

  /**
   * Audit `before` for a delete: the locale plus how many version translations
   * go dormant with it — the reach of the delete, kept out of the payloads.
   */
  async describeForAudit(id: string, projectId: string) {
    const localization = await this.prisma.localization.findFirst({ where: { id, projectId } });
    if (!localization) {
      return undefined;
    }
    return {
      ...localization,
      versionTranslations: await this.localizations.countVersionTranslations(id),
    };
  }

  async getVersionLocalization(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
  ) {
    const source = await this.loadSource(versionId, contentId, projectId);
    const localization = await this.requireTargetLocalization(projectId, code);
    const rows = await this.content.listVersionLocalizations(versionId);
    const row = rows.find((item) => item.localizationId === localization.id);
    return this.mapVersionLocalization(versionId, localization, source, row);
  }

  async updateVersionLocalization(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
    body: UpdateVersionLocalizationBody,
  ) {
    const source = await this.loadSource(versionId, contentId, projectId);
    const localization = await this.requireTargetLocalization(projectId, code);
    // Fail before any provider lookup: a frozen version refuses the write anyway.
    await this.content.contentVersionIsEditable(versionId);

    const rows = await this.content.listVersionLocalizations(versionId);
    const row = rows.find((item) => item.localizationId === localization.id);
    const stored = toStored(row);
    const enabled = body.enabled ?? row?.enabled ?? false;

    const submitted = new Map(Object.entries(body.translations ?? {}));
    this.assertTranslationsValid(submitted, source, stored);
    const translations = this.effectiveTranslations(submitted);

    if (translations.size === 0) {
      // Nothing to translate — `translations` omitted, empty, or all blank
      // (blank keeps the existing text). This must NOT take the save path:
      // saving re-bases the source snapshot, which would clear every outdated
      // flag without a single unit having been re-translated. At most it is a
      // state-only write, which leaves localized/backup untouched.
      if (body.enabled !== undefined) {
        await this.content.upsertVersionLocalization({
          versionId,
          localizationId: localization.id,
          enabled,
        });
      }
    } else {
      const payload = applyTranslationUnits(source, stored, translations);
      // The widget renders an embed from parsedUrl/oembed, not the raw url.
      // Only embeds whose url actually changed are looked up — an embed echoed
      // back unchanged keeps its stored resolution, so a provider hiccup can
      // never erase it.
      await resolveStaleEmbeds(payload.localized, (url) => this.fetchOembed(url));
      await this.content.upsertVersionLocalization({
        versionId,
        localizationId: localization.id,
        enabled,
        localized: payload.localized as never,
        backup: payload.backup as never,
      });
    }

    return this.getVersionLocalization(versionId, contentId, projectId, code);
  }

  /** The locales a version can be translated into — every project locale but the default. */
  async listTargetLocalizations(projectId: string): Promise<LocalizationRow[]> {
    const localizations = await this.listProjectLocalizations(projectId);
    return localizations.filter((localization) => !localization.isDefault);
  }

  /**
   * Per-locale translation status of a version (the `localizations` expand).
   * `targets` comes from listTargetLocalizations, loaded ONCE per request — a
   * version list would otherwise re-read the project's locales for every row.
   */
  async summarizeVersion(
    targets: LocalizationRow[],
    version: {
      id: string;
      data?: unknown;
      steps?: { cvid: string | null; data: unknown }[];
      content?: { type?: string | null } | null;
    },
  ): Promise<VersionLocalizationSummary[]> {
    const contentType = version.content?.type ?? '';
    if (!isContentTypeLocalizable(contentType) || targets.length === 0) {
      return [];
    }
    const rows = await this.content.listVersionLocalizations(version.id);
    const source = this.toSource(contentType, version.steps ?? [], version.data);
    return targets.map((localization) => {
      const row = rows.find((item) => item.localizationId === localization.id);
      const stats = summarizeTranslationUnits(readTranslationUnits(source, toStored(row)));
      return {
        code: localization.code,
        name: localization.name,
        enabled: row?.enabled ?? false,
        missing: stats.missing,
        outdated: stats.outdated,
      };
    });
  }

  private async listProjectLocalizations(projectId: string): Promise<LocalizationRow[]> {
    return this.localizations.findMany(projectId);
  }

  /** A locale of THIS project in the given state — anything else is a 404. */
  private async requireLocalization(
    id: string,
    projectId: string,
    state: { deleted: boolean },
  ): Promise<LocalizationRow> {
    const localization = await this.prisma.localization.findFirst({
      where: { id, projectId, deleted: state.deleted },
    });
    if (!localization) {
      throw new LocalizationNotFoundError();
    }
    return localization;
  }

  /** The domain raises a generic duplicate error; this surface answers 409. */
  private toConflict(err: unknown): unknown {
    if (err instanceof ResourceAlreadyExistsError) {
      return new ResourceConflictError();
    }
    return err;
  }

  private mapLocalization = (row: LocalizationRow) => ({
    id: row.id,
    object: ApiObjectType.LOCALIZATION as const,
    code: row.code,
    name: row.name,
    locale: row.locale,
    isDefault: row.isDefault,
    deleted: row.deleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  private mapVersionLocalization(
    versionId: string,
    localization: LocalizationRow,
    source: TranslationSource,
    row: VersionLocalizationRow | undefined,
  ) {
    const units = readTranslationUnits(source, toStored(row));
    return {
      object: ApiObjectType.CONTENT_VERSION_LOCALIZATION as const,
      versionId,
      code: localization.code,
      name: localization.name,
      enabled: row?.enabled ?? false,
      stats: summarizeTranslationUnits(units),
      units,
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  }

  /** The version's source text, scoped to the project + content in the URL. */
  private async loadSource(
    versionId: string,
    contentId: string,
    projectId: string,
  ): Promise<TranslationSource> {
    const version = await this.content.getContentVersionWithRelations(versionId, projectId, {
      steps: { orderBy: { sequence: 'asc' } },
      content: true,
    });
    if (!version || (version as { contentId?: string }).contentId !== contentId) {
      throw new ContentNotFoundError();
    }
    const contentType = (version as { content?: { type?: string | null } | null }).content?.type;
    if (!contentType || !isContentTypeLocalizable(contentType)) {
      throw new ValidationError(
        `${contentType ?? 'This content type'} has no translatable text — localization applies to flow, checklist, launcher, banner, announcement and resource-center versions.`,
      );
    }
    return this.toSource(
      contentType,
      (version.steps ?? []) as { cvid: string | null; data: unknown }[],
      (version as { data?: unknown }).data,
    );
  }

  private toSource(
    contentType: string,
    steps: { cvid: string | null; data: unknown }[],
    data: unknown,
  ): TranslationSource {
    return {
      contentType,
      steps:
        contentType === ContentDataType.FLOW
          ? steps
              .filter((step) => Boolean(step.cvid && step.data))
              .map((step) => ({
                cvid: step.cvid as string,
                data: step.data as ContentEditorRoot[],
              }))
          : [],
      data,
    };
  }

  /** A locale a version can be translated INTO — i.e. any project locale but the default. */
  private async requireTargetLocalization(
    projectId: string,
    code: string,
  ): Promise<LocalizationRow> {
    const localization = await this.prisma.localization.findUnique({
      where: { projectId_code: { projectId, code } },
    });
    // A soft-deleted locale is not a translation target until it is restored.
    if (!localization || localization.deleted) {
      throw new LocalizationNotFoundError();
    }
    if (localization.isDefault) {
      throw new ValidationError(
        `"${code}" is the project's default locale — the source language content is authored in. Translations exist only for the other locales.`,
      );
    }
    return localization;
  }

  /**
   * Reject the whole write on any unaddressable path or unusable media URL, with
   * every problem listed — a dropped unit would read back as "saved" to a caller
   * that cannot see the difference.
   */
  private assertTranslationsValid(
    translations: ReadonlyMap<string, string>,
    source: TranslationSource,
    stored: StoredTranslation | undefined,
  ): void {
    const currentByPath = new Map(
      readTranslationUnits(source, stored).map((unit) => [unit.path, unit.translation]),
    );
    const issues: ValidationIssue[] = [];
    translations.forEach((value, path) => {
      if (!currentByPath.has(path)) {
        issues.push({
          rule: 'schema',
          path: `translations.${path}`,
          message:
            'unknown unit path — it is not part of this version (the source may have changed since you read it). Re-read the units and use their `path` values verbatim.',
        });
        return;
      }
      const url = value.trim();
      // Same bar as the version write: the SDK renders these verbatim into
      // src/href. A value this translation already stores passes unchanged.
      if (
        url !== '' &&
        isMediaUrlUnitPath(path) &&
        !isHttpUrl(url) &&
        currentByPath.get(path) !== value &&
        currentByPath.get(path) !== url
      ) {
        issues.push({
          rule: 'media_url',
          path: `translations.${path}`,
          message: `must be a full http(s) URL (it is rendered verbatim on the page, so ${JSON.stringify(value)} would just be broken there).`,
        });
      }
    });
    if (issues.length > 0) {
      throw ValidationError.fromIssues(issues);
    }
  }

  /**
   * The translations that actually change something. A blank value keeps the
   * existing translation, so it is not a write. Media URLs are trimmed — the SDK
   * renders them verbatim into src/href; translated TEXT is kept as sent, since
   * leading/trailing spaces are meaningful between adjacent text runs.
   */
  private effectiveTranslations(submitted: ReadonlyMap<string, string>): Map<string, string> {
    const effective = new Map<string, string>();
    submitted.forEach((value, path) => {
      if (value.trim() === '') {
        return;
      }
      effective.set(path, isMediaUrlUnitPath(path) ? value.trim() : value);
    });
    return effective;
  }

  /** One oEmbed lookup, capped — the same budget as the version write path. */
  private fetchOembed(url: string) {
    return Promise.race([
      this.utilities.queryOembedInfo(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('oembed timeout')), OEMBED_TIMEOUT_MS),
      ),
    ]);
  }
}
