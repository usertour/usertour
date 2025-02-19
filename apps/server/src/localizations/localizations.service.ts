import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateLocalizationInput, UpdateLocalizationInput } from './dto/localization.input';
import { ParamsError } from '@/common/errors';

@Injectable()
export class LocalizationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateLocalizationInput) {
    return await this.prisma.localization.create({
      data,
    });
  }

  async setDefault(id: string) {
    const item = await this.prisma.localization.findFirst({ where: { id } });
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
    return await this.prisma.localization.update({
      where: { id },
      data: { ...others },
    });
  }

  async delete(id: string) {
    const item = await this.prisma.localization.findUnique({ where: { id } });
    if (!item || item.isDefault) {
      throw new ParamsError();
    }
    return await this.prisma.localization.delete({
      where: { id },
    });
  }

  async get(id: string) {
    return await this.prisma.localization.findUnique({
      where: { id },
    });
  }

  async findMany(projectId: string) {
    return await this.prisma.localization.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
