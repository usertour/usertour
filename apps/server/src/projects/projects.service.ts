import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateProjectInput } from './dto/createProject.input';
import { ParamsError } from '@/common/errors';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(userId: string, newData: CreateProjectInput) {
    const projects = await this.prisma.user.findUnique({ where: { id: userId } }).projects();
    // const hasProject = projects.some((pro) => pro.userId == userId);
    if (projects.length > 0) {
      throw new ParamsError();
    }
    return this.prisma.project.create({
      data: {
        ...newData,
        users: {
          create: [{ userId, role: 'ADMIN', actived: false }],
        },
        environments: { create: [{ name: 'Production' }] },
      },
      include: {
        environments: true,
      },
    });
  }

  async getUserProject(userId: string, projectId: string) {
    return await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
  }
}
