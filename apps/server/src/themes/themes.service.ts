import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CopyThemeInput, CreateThemeInput, UpdateThemeInput } from './dto/theme.input';
import { ParamsError } from '@/common/errors';

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  async createTheme(data: CreateThemeInput) {
    if (data.isDefault) {
      await this.unsetThemeDefault(data.projectId);
    }
    return await this.prisma.theme.create({
      data,
    });
  }

  async unsetThemeDefault(projectId: string) {
    return await this.prisma.theme.updateMany({
      where: { isDefault: true, projectId },
      data: { isDefault: false },
    });
  }

  async setDefaultTheme(themeId: string) {
    const theme = await this.prisma.theme.findFirst({ where: { id: themeId } });
    if (!theme) {
      throw new ParamsError();
    }
    await this.unsetThemeDefault(theme.projectId);
    return await this.prisma.theme.update({
      where: { id: themeId },
      data: { isDefault: true },
    });
  }

  async updateTheme(data: UpdateThemeInput) {
    const { id, isDefault, ...others } = data;
    const theme = await this.prisma.theme.findFirst({ where: { id: data.id } });
    if (!theme || theme.isSystem) {
      throw new ParamsError();
    }
    return await this.prisma.theme.update({
      where: { id },
      data: { ...others },
    });
  }

  async getTheme(id: string) {
    return await this.prisma.theme.findUnique({
      where: { id },
    });
  }

  async deleteTheme(id: string) {
    const theme = await this.prisma.theme.findFirst({ where: { id } });
    if (theme.isSystem) {
      throw new ParamsError();
    }
    return await this.prisma.theme.delete({
      where: { id },
    });
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
      orderBy: { createdAt: 'asc' },
    });
  }
}
