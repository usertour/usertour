import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateProjectInput } from './dto/createProject.input';
import {
  ParamsError,
  InvalidLicenseError,
  LicenseExpiredError,
  LicenseProjectMismatchError,
  LicenseDecodeError,
} from '@/common/errors';
import { LicenseService } from '@/license/license.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private licenseService: LicenseService,
  ) {}

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

  async getProject(projectId: string) {
    return await this.prisma.project.findUnique({
      where: { id: projectId },
    });
  }

  async getProjectLicenseInfo(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.license) {
      return null;
    }

    try {
      const validationResult = await this.licenseService.validateLicense(project.license);
      const payload = await this.licenseService.getLicensePayload(project.license);
      const expirationInfo = await this.licenseService.getExpirationInfo(project.license);

      return {
        license: project.license,
        payload: payload,
        isValid: validationResult.isValid,
        isExpired: expirationInfo?.isExpired || false,
        error: validationResult.error || null,
        daysRemaining: expirationInfo?.daysUntilExpiration || null,
      };
    } catch {
      return null;
    }
  }

  async updateProjectName(userId: string, projectId: string, name: string) {
    // Check if user has access to the project
    const userProject = await this.getUserProject(userId, projectId);
    if (!userProject) {
      throw new ParamsError('Project not found or no access');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
  }

  async updateProjectLicense(userId: string, projectId: string, license: string) {
    // Check if user has access to the project
    const userProject = await this.getUserProject(userId, projectId);
    if (!userProject) {
      throw new ParamsError('Project not found or no access');
    }

    // Validate license
    const validationResult = await this.licenseService.validateLicense(license);
    if (!validationResult.isValid) {
      throw new InvalidLicenseError();
    }

    // Get license payload to check plan type
    const licensePayload = await this.licenseService.getLicensePayload(license);
    if (!licensePayload) {
      throw new LicenseDecodeError();
    }

    // Check if license projectId matches the target project
    if (licensePayload.projectId !== projectId) {
      throw new LicenseProjectMismatchError();
    }

    // Check if license is expired
    const expirationInfo = await this.licenseService.getExpirationInfo(license);
    if (expirationInfo?.isExpired) {
      throw new LicenseExpiredError();
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { license },
    });
  }
}
