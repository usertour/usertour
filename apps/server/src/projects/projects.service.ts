import { PrismaService } from "nestjs-prisma";
import { Injectable, ConflictException } from "@nestjs/common";
import { CreateProjectInput } from "./dto/createProject.input";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(userId: string, newData: CreateProjectInput) {
    const projects = await this.prisma.user
      .findUnique({ where: { id: userId } })
      .projects();
    // const hasProject = projects.some((pro) => pro.userId == userId);
    if (projects.length > 0) {
      throw new ConflictException(`The user already create project.`);
    }
    return this.prisma.project.create({
      data: {
        ...newData,
        users: {
          create: [{ userId, role: "ADMIN", actived: false }],
        },
        environments: { create: [{ name: "Production" }] },
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
