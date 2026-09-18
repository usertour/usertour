import { Injectable } from '@nestjs/common';
import type { LocalizedEmbedResolutions } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  ContentNotFoundError,
  LocalizationNotFoundError,
  ValidationError,
  type ValidationIssue,
} from '@/common/errors/errors';
import { isHttpUrl } from '@/common/url';
import { ContentService } from '@/content/content.service';
import { UtilitiesService } from '@/utilities/utilities.service';

import { ApiObjectType } from '../shared/object-type';
import type {
  UpdateVersionLocalizationBody,
  VersionLocalizationSummary,
} from './localizations.schema';
import {
  type StoredTranslation,
  type TranslationSource,
  applyTranslationUnits,
  isContentTypeLocalizable,
  isEmbedUrlUnitPath,
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
 * v2 localizations handler: the project's locales (read-only) and each content
 * version's translation per locale, as flat translation units. Persistence is
 * delegated to the domain `upsertVersionLocalization` — the same single write
 * entry the dashboard saves through — so the editable-draft gate, the link
 * schema stamp and the version touch all apply unchanged.
 */
@Injectable()
export class ApiLocalizationsService {
  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
    private readonly utilities: UtilitiesService,
  ) {}

  async list(projectId: string) {
    const rows = await this.listProjectLocalizations(projectId);
    // A project holds a handful of locales — one page, in the list envelope
    // every v2 collection uses.
    return { results: rows.map(this.mapLocalization), next: null, previous: null };
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

    if (body.translations === undefined) {
      // State-only write: omitting localized/backup keeps the stored translation.
      await this.content.upsertVersionLocalization({
        versionId,
        localizationId: localization.id,
        enabled,
      });
    } else {
      const translations = new Map(Object.entries(body.translations));
      this.assertTranslationsValid(translations, source, stored);
      const embedResolutions = await this.resolveEmbeds(translations);
      const payload = applyTranslationUnits(source, stored, translations, embedResolutions);
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

  /** Per-locale translation status of a version (the `localizations` expand). */
  async summarizeVersion(
    projectId: string,
    version: {
      id: string;
      data?: unknown;
      steps?: { cvid: string | null; data: unknown }[];
      content?: { type?: string | null } | null;
    },
  ): Promise<VersionLocalizationSummary[]> {
    const contentType = version.content?.type ?? '';
    if (!isContentTypeLocalizable(contentType)) {
      return [];
    }
    const [localizations, rows] = await Promise.all([
      this.listProjectLocalizations(projectId),
      this.content.listVersionLocalizations(version.id),
    ]);
    const source = this.toSource(contentType, version.steps ?? [], version.data);
    return localizations
      .filter((localization) => !localization.isDefault)
      .map((localization) => {
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
    return this.prisma.localization.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private mapLocalization = (row: LocalizationRow) => ({
    id: row.id,
    object: ApiObjectType.LOCALIZATION as const,
    code: row.code,
    name: row.name,
    locale: row.locale,
    isDefault: row.isDefault,
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
    if (!localization) {
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
        currentByPath.get(path) !== value
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
   * The widget renders an embed from parsedUrl/oembed, not the raw url, so every
   * translated embed URL is resolved the way the dashboard's import does. A
   * provider failure degrades to a plain iframe on the url — never fails the write.
   */
  private async resolveEmbeds(
    translations: ReadonlyMap<string, string>,
  ): Promise<LocalizedEmbedResolutions> {
    const urls = new Set<string>();
    translations.forEach((value, path) => {
      const url = value.trim();
      if (isEmbedUrlUnitPath(path) && url !== '') {
        urls.add(url);
      }
    });
    const entries = await Promise.all(
      [...urls].map(async (url) => {
        try {
          const info = await Promise.race([
            this.utilities.queryOembedInfo(url),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('oembed timeout')), OEMBED_TIMEOUT_MS),
            ),
          ]);
          const oembed = info?.html
            ? { html: info.html, width: info.width, height: info.height }
            : undefined;
          return [url, { parsedUrl: url, oembed }] as const;
        } catch {
          return [url, { parsedUrl: url, oembed: undefined }] as const;
        }
      }),
    );
    return new Map(entries) as LocalizedEmbedResolutions;
  }
}
