import { Injectable } from '@nestjs/common';
import {
  LOCALIZED_UNITS_SCHEMA_VERSION,
  blankLocalizedUnitClones,
  deepClone,
  isSafeDestinationUrl,
} from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  LocalizationNotFoundError,
  ValidationError,
  type ValidationIssue,
} from '@/common/errors/errors';
import {
  collectStaleEmbedUrls,
  fetchEmbedResolutions,
  installEmbedResolutions,
} from '@/common/ombed/embed-resolve';
import { isHttpUrl } from '@/common/url';
import { UtilitiesService } from '@/modules/utilities/services/utilities.service';

import { ContentService } from './content.service';
import {
  type StoredTranslation,
  type TranslationSource,
  type TranslationStats,
  type TranslationUnitView,
  applyTranslationUnits,
  isContentTypeLocalizable,
  readTranslationUnits,
  summarizeTranslationUnits,
} from './version-translation';

/** A project locale a version can be translated into. */
export interface TranslationTarget {
  id: string;
  code: string;
  name: string;
}

/** One locale of a version, as translation units. */
export interface VersionTranslation {
  versionId: string;
  target: TranslationTarget;
  enabled: boolean;
  units: TranslationUnitView[];
  stats: TranslationStats;
  /** When the translation was last saved; null when it never was. */
  updatedAt: Date | null;
}

/** Per-locale status of a version. */
export interface VersionTranslationStatus {
  code: string;
  name: string;
  enabled: boolean;
  missing: number;
  outdated: number;
}

export interface VersionTranslationChange {
  /**
   * Unit path → translated text. `null` clears the unit (text reads as
   * untranslated again; a media or link url falls back to the source's); a
   * blank string keeps the existing translation, so a caller echoing units back
   * can never erase one by accident.
   */
  translations?: Record<string, string | null>;
  enabled?: boolean;
}

/** The translation row a save left behind, with the draft it touched. */
export type SavedVersionLocalization = Awaited<
  ReturnType<ContentService['saveVersionLocalization']>
>;

interface VersionLocalizationRow {
  localizationId: string;
  enabled: boolean;
  localized: unknown;
  backup: unknown;
  localizedSchemaVersion: number;
  updatedAt: Date;
}

interface TranslatableVersion {
  id: string;
  data?: unknown;
  steps?: { cvid: string | null; data: unknown }[];
  content?: { type?: string | null } | null;
}

/**
 * The stored row as a translation. A row stamped below the current schema
 * version still holds verbatim source clones in the stores that became units
 * after it was saved; they are blanked here, on read and on write alike, so
 * a clone can never read as a translator's pin — nor be saved back as one
 * and stamped current. The deploy-time backfill does the same to the rows
 * themselves; this keeps correctness from depending on it having run.
 */
const toStored = (
  row: { localized: unknown; backup: unknown; localizedSchemaVersion: number } | undefined,
): StoredTranslation | undefined => {
  if (!row) {
    return undefined;
  }
  if (row.localizedSchemaVersion >= LOCALIZED_UNITS_SCHEMA_VERSION) {
    return { localized: row.localized, backup: row.backup };
  }
  const localized = deepClone(row.localized);
  blankLocalizedUnitClones(localized, row.localizedSchemaVersion);
  return { localized, backup: row.backup };
};

/**
 * Reading and writing a version's translation as translation units — the
 * business rules of translating, independent of who asks: which versions and
 * locales can be translated, what a unit is, what a write may change, and what
 * it must leave alone. Protocol surfaces (REST, MCP, the dashboard's GraphQL)
 * only adapt their input and output around it.
 *
 * Persistence goes through ContentService.saveVersionLocalization, the single
 * write entry for translations, so the editable-draft gate, the link schema
 * stamp and the version touch apply to every caller alike.
 */
@Injectable()
export class VersionTranslationService {
  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
    private readonly utilities: UtilitiesService,
  ) {}

  async read(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
  ): Promise<VersionTranslation> {
    const source = await this.loadSource(versionId, contentId, projectId);
    const target = await this.requireTarget(projectId, code);
    const row = await this.findRow(versionId, target.id);
    return this.toTranslation(versionId, target, source, row);
  }

  /** Save a change and read the locale back as units. */
  async write(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
    change: VersionTranslationChange,
  ): Promise<VersionTranslation> {
    await this.save(versionId, contentId, projectId, code, change);
    return this.read(versionId, contentId, projectId, code);
  }

  /**
   * Save a change: the listed units are merged into the stored translation,
   * every other unit is left as it is. Returns the saved row, or undefined when
   * the change held nothing to write.
   */
  async save(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
    change: VersionTranslationChange,
  ): Promise<SavedVersionLocalization | undefined> {
    const source = await this.loadSource(versionId, contentId, projectId);
    const target = await this.requireTarget(projectId, code);
    // Fail before any provider lookup: a frozen version refuses the write anyway.
    await this.content.contentVersionIsEditable(versionId);

    const stored = toStored(await this.findRow(versionId, target.id));
    const submitted = new Map(Object.entries(change.translations ?? {}));
    const units = readTranslationUnits(source, stored);
    this.assertTranslationsValid(submitted, units);
    const translations = this.effectiveTranslations(submitted, units);

    if (translations.size === 0) {
      // Nothing to translate — `translations` omitted, empty, or all blank
      // (blank keeps the existing text). This must NOT take the save path:
      // saving re-bases the source snapshot, which would clear every outdated
      // flag without a single unit having been re-translated. At most it is a
      // state-only write, which leaves localized/backup untouched.
      if (change.enabled === undefined) {
        return undefined;
      }
      return this.content.saveVersionLocalization(versionId, target.id, () => ({
        enabled: change.enabled,
      }));
    }

    // The widget renders an embed from parsedUrl/oembed, not the raw url, so a
    // changed embed url needs a provider lookup — network, which cannot run
    // while the save holds its lock. Apply once against the row as read here to
    // learn which urls need one (an embed echoed back unchanged keeps its stored
    // resolution, so a provider hiccup can never erase it), look them up, then
    // let the locked save re-apply onto the row as it stands by then and settle
    // its embeds from the answers.
    const preview = applyTranslationUnits(source, stored, translations);
    const resolutions = await fetchEmbedResolutions(
      collectStaleEmbedUrls(preview.localized),
      (url) => this.utilities.queryOembedInfo(url),
    );
    return this.content.saveVersionLocalization(versionId, target.id, (current) => {
      const payload = applyTranslationUnits(source, toStored(current), translations);
      installEmbedResolutions(payload.localized, resolutions);
      return { enabled: change.enabled, localized: payload.localized, backup: payload.backup };
    });
  }

  /** The locales a version can be translated into — every live project locale but the default. */
  async listTargets(projectId: string): Promise<TranslationTarget[]> {
    return this.prisma.localization.findMany({
      where: { projectId, deleted: false, isDefault: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  /**
   * Per-locale translation status of a version. `targets` comes from
   * listTargets, loaded ONCE per request — a version list would otherwise
   * re-read the project's locales for every row.
   */
  async summarize(
    targets: TranslationTarget[],
    version: TranslatableVersion,
  ): Promise<VersionTranslationStatus[]> {
    const contentType = version.content?.type ?? '';
    if (!isContentTypeLocalizable(contentType) || targets.length === 0) {
      return [];
    }
    const rows = await this.content.listVersionLocalizations(version.id);
    const source = this.toSource(contentType, version.steps ?? [], version.data);
    return targets.map((target) => {
      const row = rows.find((item) => item.localizationId === target.id);
      const stats = summarizeTranslationUnits(readTranslationUnits(source, toStored(row)));
      return {
        code: target.code,
        name: target.name,
        enabled: row?.enabled ?? false,
        missing: stats.missing,
        outdated: stats.outdated,
      };
    });
  }

  private async findRow(
    versionId: string,
    localizationId: string,
  ): Promise<VersionLocalizationRow | undefined> {
    const rows = await this.content.listVersionLocalizations(versionId);
    return rows.find((item) => item.localizationId === localizationId);
  }

  private toTranslation(
    versionId: string,
    target: TranslationTarget,
    source: TranslationSource,
    row: VersionLocalizationRow | undefined,
  ): VersionTranslation {
    const units = readTranslationUnits(source, toStored(row));
    return {
      versionId,
      target,
      enabled: row?.enabled ?? false,
      units,
      stats: summarizeTranslationUnits(units),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  /** The version's source text, scoped to the project and content it is addressed under. */
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

  /** A locale a version can be translated INTO — any live project locale but the default. */
  private async requireTarget(projectId: string, code: string): Promise<TranslationTarget> {
    const localization = await this.prisma.localization.findUnique({
      where: { projectId_code: { projectId, code } },
    });
    // A soft-deleted locale is not a translation target until it is restored.
    if (!localization || localization.deleted) {
      throw new LocalizationNotFoundError('code');
    }
    if (localization.isDefault) {
      throw new ValidationError(
        `"${code}" is the project's default locale — the source language content is authored in. Translations exist only for the other locales.`,
      );
    }
    return { id: localization.id, code: localization.code, name: localization.name };
  }

  /**
   * Reject the whole write on any unaddressable path or unusable url, with
   * every problem listed — a dropped unit would read back as "saved" to a caller
   * that cannot see the difference.
   */
  private assertTranslationsValid(
    translations: ReadonlyMap<string, string | null>,
    units: readonly TranslationUnitView[],
  ): void {
    const unitByPath = new Map(units.map((unit) => [unit.path, unit]));
    const issues: ValidationIssue[] = [];
    translations.forEach((value, path) => {
      const unit = unitByPath.get(path);
      if (!unit) {
        issues.push({
          rule: 'schema',
          path: `translations.${path}`,
          message:
            'unknown unit path — it is not part of this version (the source may have changed since you read it). Re-read the units and use their `path` values verbatim.',
        });
        return;
      }
      if (value === null) {
        return;
      }
      const url = value.trim();
      // A value this translation already stores passes unchanged.
      if (url === '' || unit.translation === value || unit.translation === url) {
        return;
      }
      // Same bars as the version write: a media url is rendered verbatim into
      // src, a destination into href.
      if (unit.kind === 'media' && !isHttpUrl(url)) {
        issues.push({
          rule: 'media_url',
          path: `translations.${path}`,
          message: `must be a full http(s) URL (it is rendered verbatim on the page, so ${JSON.stringify(value)} would just be broken there).`,
        });
      }
      if (unit.kind === 'destination' && !isSafeDestinationUrl(url)) {
        issues.push({
          rule: 'destination_url',
          path: `translations.${path}`,
          message: `must be a path or an http(s) / mailto / tel URL — ${JSON.stringify(value)} uses a scheme that is never allowed in a link.`,
        });
      }
    });
    if (issues.length > 0) {
      throw ValidationError.fromIssues(issues);
    }
  }

  /**
   * The translations that actually change something. A blank value keeps the
   * existing translation, so it is not a write; `null` is — it clears. Urls
   * (destinations and media) are trimmed — the SDK renders them verbatim into
   * href/src; translated TEXT is kept as sent, since leading/trailing spaces
   * are meaningful between adjacent text runs.
   */
  private effectiveTranslations(
    submitted: ReadonlyMap<string, string | null>,
    units: readonly TranslationUnitView[],
  ): Map<string, string | null> {
    const kindByPath = new Map(units.map((unit) => [unit.path, unit.kind]));
    const effective = new Map<string, string | null>();
    submitted.forEach((value, path) => {
      if (value === null) {
        effective.set(path, null);
        return;
      }
      if (value.trim() === '') {
        return;
      }
      effective.set(path, kindByPath.get(path) === 'text' ? value : value.trim());
    });
    return effective;
  }
}
