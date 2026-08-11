import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CopyThemeInput, CreateThemeInput, UpdateThemeInput } from './dto/theme.input';
import { ParamsError, ThemeInUseError } from '@/common/errors';
import { ProjectCacheService } from '@/shared/project-cache.service';

@Injectable()
export class ThemesService {
  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
  ) {}

  async createTheme(data: CreateThemeInput) {
    if (data.isDefault) {
      await this.unsetThemeDefault(data.projectId);
    }
    const created = await this.prisma.theme.create({
      data,
    });
    await this.cache.invalidate(this.cache.keys.themes(created.projectId));
    return created;
  }

  async unsetThemeDefault(projectId: string) {
    const result = await this.prisma.theme.updateMany({
      where: { isDefault: true, projectId },
      data: { isDefault: false },
    });
    await this.cache.invalidate(this.cache.keys.themes(projectId));
    return result;
  }

  async setDefaultTheme(themeId: string) {
    const theme = await this.prisma.theme.findFirst({ where: { id: themeId } });
    if (!theme) {
      throw new ParamsError();
    }
    await this.unsetThemeDefault(theme.projectId);
    const updated = await this.prisma.theme.update({
      where: { id: themeId },
      data: { isDefault: true },
    });
    await this.cache.invalidate(this.cache.keys.themes(updated.projectId));
    return updated;
  }

  async updateTheme(data: UpdateThemeInput) {
    const { id, isDefault, ...others } = data;
    const theme = await this.prisma.theme.findFirst({ where: { id: data.id } });
    if (!theme || theme.isSystem) {
      throw new ParamsError();
    }
    const updated = await this.prisma.theme.update({
      where: { id },
      data: { ...others },
    });
    await this.cache.invalidate(this.cache.keys.themes(updated.projectId));
    return updated;
  }

  async getTheme(id: string) {
    return await this.prisma.theme.findUnique({
      where: { id },
    });
  }

  async deleteTheme(id: string) {
    const theme = await this.prisma.theme.findFirst({ where: { id } });
    if (theme.isSystem || theme.isDefault) {
      throw new ParamsError();
    }
    // Refuse while the theme is ACTIVELY used: by a live published version or a
    // content's current draft (version-level themeId or a per-step override).
    // Historical-version references don't block — versions are permanent, so they
    // would make every once-used theme undeletable. Without this guard the FK's
    // ON DELETE SET NULL silently strips the theme from live versions, which then
    // stop rendering (the runtime has no fallback theme).
    const usesTheme = { OR: [{ themeId: id }, { steps: { some: { themeId: id } } }] };
    const [draftUsers, liveUsers] = await Promise.all([
      this.prisma.content.findMany({
        where: { deleted: false, editedVersion: usesTheme },
        select: { name: true },
        take: 6,
      }),
      this.prisma.content.findMany({
        where: {
          deleted: false,
          contentOnEnvironments: { some: { published: true, publishedVersion: usesTheme } },
        },
        select: { name: true },
        take: 6,
      }),
    ]);
    const names = [...new Set([...liveUsers, ...draftUsers].map((c) => c.name))];
    if (names.length > 0) {
      const shown = names.slice(0, 5).join(', ');
      throw new ThemeInUseError(
        `Cannot delete this theme: it is used by live or draft content (${shown}${
          names.length > 5 ? ', …' : ''
        }). Switch that content to another theme first.`,
      );
    }
    const deleted = await this.prisma.theme.delete({
      where: { id },
    });
    await this.cache.invalidate(this.cache.keys.themes(deleted.projectId));
    return deleted;
  }

  async copyTheme(input: CopyThemeInput) {
    const { settings, projectId, variations } = await this.prisma.theme.findUnique({
      where: { id: input.id },
    });
    const data: CreateThemeInput = {
      settings,
      projectId,
      isDefault: false,
      name: input.name,
      variations,
    };
    return await this.createTheme(data);
  }

  async listThemesByProjectId(projectId: string) {
    return await this.prisma.theme.findMany({
      where: { projectId },
      orderBy: { id: 'asc' },
    });
  }
}
