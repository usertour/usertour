import { Injectable } from '@nestjs/common';
import { ContentDataType } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  LocalizationNotFoundError,
  ValidationError,
  type ValidationIssue,
} from '@/common/errors/errors';
import { resolveStaleEmbeds } from '@/common/ombed/embed-resolve';
import { isHttpUrl } from '@/common/url';
import { UtilitiesService } from '@/utilities/utilities.service';

import { ContentService } from './content.service';
import {
  type StoredTranslation,
  type TranslationSource,
  type TranslationStats,
  type TranslationUnitView,
  applyTranslationUnits,
  isContentTypeLocalizable,
  isMediaUrlUnitPath,
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
  /** Unit path → translated text. A blank value keeps the existing translation. */
  translations?: Record<string, string>;
  enabled?: boolean;
}

interface VersionLocalizationRow {
  localizationId: string;
  enabled: boolean;
  localized: unknown;
  backup: unknown;
  updatedAt: Date;
}

interface TranslatableVersion {
  id: string;
  data?: unknown;
  steps?: { cvid: string | null; data: unknown }[];
  content?: { type?: string | null } | null;
}

const toStored = (row: VersionLocalizationRow | undefined): StoredTranslation | undefined =>
  row ? { localized: row.localized, backup: row.backup } : undefined;

/**
 * Reading and writing a version's translation as translation units — the
 * business rules of translating, independent of who asks: which versions and
 * locales can be translated, what a unit is, what a write may change, and what
 * it must leave alone. Protocol surfaces (REST, MCP, and eventually the
 * dashboard's GraphQL) only adapt their input and output around it.
 *
 * Persistence goes through ContentService.upsertVersionLocalization, the single
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

  async write(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
    change: VersionTranslationChange,
  ): Promise<VersionTranslation> {
    const source = await this.loadSource(versionId, contentId, projectId);
    const target = await this.requireTarget(projectId, code);
    // Fail before any provider lookup: a frozen version refuses the write anyway.
    await this.content.contentVersionIsEditable(versionId);

    const row = await this.findRow(versionId, target.id);
    const stored = toStored(row);
    const enabled = change.enabled ?? row?.enabled ?? false;

    const submitted = new Map(Object.entries(change.translations ?? {}));
    this.assertTranslationsValid(submitted, source, stored);
    const translations = this.effectiveTranslations(submitted);

    if (translations.size === 0) {
      // Nothing to translate — `translations` omitted, empty, or all blank
      // (blank keeps the existing text). This must NOT take the save path:
      // saving re-bases the source snapshot, which would clear every outdated
      // flag without a single unit having been re-translated. At most it is a
      // state-only write, which leaves localized/backup untouched.
      if (change.enabled !== undefined) {
        await this.content.upsertVersionLocalization({
          versionId,
          localizationId: target.id,
          enabled,
        });
      }
    } else {
      const payload = applyTranslationUnits(source, stored, translations);
      // The widget renders an embed from parsedUrl/oembed, not the raw url.
      // Only embeds whose url actually changed are looked up — an embed echoed
      // back unchanged keeps its stored resolution, so a provider hiccup can
      // never erase it.
      await resolveStaleEmbeds(payload.localized, (url) => this.utilities.queryOembedInfo(url));
      await this.content.upsertVersionLocalization({
        versionId,
        localizationId: target.id,
        enabled,
        localized: payload.localized as never,
        backup: payload.backup as never,
      });
    }

    return this.read(versionId, contentId, projectId, code);
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
}
