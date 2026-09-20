import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import {
  LocalizationNotFoundError,
  ResourceAlreadyExistsError,
  ResourceConflictError,
} from '@/common/errors/errors';
import {
  type VersionTranslation,
  VersionTranslationService,
} from '@/content/version-translation.service';
import { LocalizationsService } from '@/modules/localizations/services/localizations.service';

import { ApiObjectType } from '../shared/object-type';
import type {
  CreateLocalizationBody,
  ListLocalizationsQuery,
  UpdateLocalizationBody,
  UpdateVersionLocalizationBody,
} from './localizations.schema';

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

/**
 * v2 localizations handler — protocol adaptation only. The rules live in the
 * domain services every surface shares, so this one maps requests onto them,
 * shapes their results as API objects and answers their errors in the v2
 * vocabulary:
 *  - the project's locales (localization:*) → LocalizationsService, the service
 *    the dashboard manages them through;
 *  - a version's translation as translation units (content:*) →
 *    VersionTranslationService.
 */
@Injectable()
export class ApiLocalizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localizations: LocalizationsService,
    private readonly translations: VersionTranslationService,
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
    await this.requireLocalization(id, projectId, { deleted: false });
    await this.localizations.delete(id);
  }

  async restore(id: string, projectId: string) {
    await this.requireLocalization(id, projectId, { deleted: true });
    return this.mapLocalization(await this.localizations.restore(id));
  }

  async getVersionLocalization(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
  ) {
    return this.mapVersionLocalization(
      await this.translations.read(versionId, contentId, projectId, code),
    );
  }

  async updateVersionLocalization(
    versionId: string,
    contentId: string,
    projectId: string,
    code: string,
    body: UpdateVersionLocalizationBody,
  ) {
    return this.mapVersionLocalization(
      await this.translations.write(versionId, contentId, projectId, code, body),
    );
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
      throw new LocalizationNotFoundError(state.deleted ? 'deleted' : 'live');
    }
    return localization;
  }

  /**
   * The domain raises a duplicate error; this surface answers 409 — carrying
   * the domain's message, which says WHICH code clashed and whether a deleted
   * locale is holding it (restore vs. pick another name).
   */
  private toConflict(err: unknown): unknown {
    if (err instanceof ResourceAlreadyExistsError) {
      return new ResourceConflictError(err.messageDict.en);
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

  private mapVersionLocalization(translation: VersionTranslation) {
    return {
      object: ApiObjectType.CONTENT_VERSION_LOCALIZATION as const,
      versionId: translation.versionId,
      code: translation.target.code,
      name: translation.target.name,
      enabled: translation.enabled,
      stats: translation.stats,
      units: translation.units,
      updatedAt: translation.updatedAt ? translation.updatedAt.toISOString() : null,
    };
  }
}
