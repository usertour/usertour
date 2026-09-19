import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';
import { CreateLocalizationInput, UpdateLocalizationInput } from './dto/localization.input';
import {
  DefaultLocalizationCannotBeDeletedError,
  ParamsError,
  ResourceAlreadyExistsError,
} from '@/common/errors';
import { ProjectCacheService } from '@/shared/project-cache.service';

/** Localization has a unique (projectId, code); surface a clash as a typed error, not a raw 500. */
const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

@Injectable()
export class LocalizationsService {
  constructor(
    private prisma: PrismaService,
    private cache: ProjectCacheService,
  ) {}

  async create(data: CreateLocalizationInput) {
    return (await this.createOrRestore(data)).localization;
  }

  /**
   * A locale's `code` stays reserved while it is soft-deleted, so creating that
   * code again restores the deleted locale — with every translation it held —
   * instead of failing on the unique constraint. `restored` tells a caller that
   * needs to say so which of the two happened.
   */
  async createOrRestore(data: CreateLocalizationInput) {
    const existing = await this.prisma.localization.findUnique({
      where: { projectId_code: { projectId: data.projectId, code: data.code } },
    });
    if (existing?.deleted) {
      const localization = await this.prisma.localization.update({
        where: { id: existing.id },
        data: { deleted: false, name: data.name, locale: data.locale },
      });
      await this.invalidateDeliveredTranslations(localization.id);
      return { localization, restored: true };
    }
    try {
      return { localization: await this.prisma.localization.create({ data }), restored: false };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ResourceAlreadyExistsError();
      }
      throw err;
    }
  }

  async setDefault(id: string) {
    const item = await this.prisma.localization.findFirst({ where: { id, deleted: false } });
    if (!item) {
      throw new ParamsError();
    }
    await this.prisma.localization.updateMany({
      where: { isDefault: true, projectId: item.projectId },
      data: { isDefault: false },
    });
    return await this.prisma.localization.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async update(data: UpdateLocalizationInput) {
    const { id, ...others } = data;
    const item = await this.prisma.localization.findFirst({ where: { id, deleted: false } });
    if (!item) {
      throw new ParamsError();
    }
    try {
      const localization = await this.prisma.localization.update({
        where: { id },
        data: { ...others },
      });
      // Delivery matches a user's locale against `code`, and the delivered
      // version snapshot carries it.
      if (localization.code !== item.code) {
        await this.invalidateDeliveredTranslations(id);
      }
      return localization;
    } catch (err) {
      // Also raised for a code held by a soft-deleted locale: it is reserved
      // until that locale is restored.
      if (isUniqueViolation(err)) {
        throw new ResourceAlreadyExistsError();
      }
      throw err;
    }
  }

  /**
   * Soft delete. The locale stops being listed and delivered at once, but the
   * translations it holds on every version are kept — restore() brings the
   * locale back exactly as it was. Version forks keep copying its rows while it
   * is deleted, so a restore is complete even for drafts forked meanwhile.
   */
  async delete(id: string) {
    const item = await this.prisma.localization.findFirst({ where: { id, deleted: false } });
    if (!item) {
      throw new ParamsError();
    }
    // The default locale is the source language content is authored in.
    if (item.isDefault) {
      throw new DefaultLocalizationCannotBeDeletedError();
    }
    const localization = await this.prisma.localization.update({
      where: { id },
      data: { deleted: true },
    });
    await this.invalidateDeliveredTranslations(id);
    return localization;
  }

  async restore(id: string) {
    const item = await this.prisma.localization.findFirst({ where: { id, deleted: true } });
    if (!item) {
      throw new ParamsError();
    }
    const localization = await this.prisma.localization.update({
      where: { id },
      data: { deleted: false },
    });
    await this.invalidateDeliveredTranslations(id);
    return localization;
  }

  async get(id: string) {
    return await this.prisma.localization.findUnique({
      where: { id },
    });
  }

  async findMany(projectId: string, options: { deleted?: boolean } = {}) {
    return await this.prisma.localization.findMany({
      where: { projectId, deleted: options.deleted ?? false },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Published versions are cached WITH their enabled translations, so a locale
   * appearing, disappearing or changing code would otherwise keep being served
   * as before until the entry expires. Dropping a key that was never cached is
   * a no-op, so every version holding a row is swept rather than resolving
   * which of them are live.
   */
  private async invalidateDeliveredTranslations(localizationId: string): Promise<void> {
    const rows = await this.prisma.versionOnLocalization.findMany({
      where: { localizationId },
      select: { versionId: true },
    });
    if (rows.length > 0) {
      await this.cache.invalidateDeferred(
        rows.map((row) => this.cache.keys.versionFull(row.versionId)),
      );
    }
  }
}
