import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Company } from '../models/company.model';
import { UpsertCompanyRequestDto } from './company.dto';
import { ListCompaniesResponseDto } from './company.dto';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { BizService } from '../../biz/biz.service';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
  ) {}

  async getCompany(id: string, environmentId: string): Promise<Company> {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
        deleted: false,
      },
      include: {
        bizUsers: true,
        bizUsersOnCompany: {
          include: {
            bizUser: true,
          },
        },
      },
    });

    if (!bizCompany) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY.NOT_FOUND.code,
      );
    }

    return this.mapBizCompanyToCompany(bizCompany);
  }

  async listCompanies(
    environmentId: string,
    cursor?: string,
    limit = 20,
  ): Promise<ListCompaniesResponseDto> {
    const companies = await this.prisma.bizCompany.findMany({
      where: {
        environmentId,
        deleted: false,
      },
      include: {
        bizUsersOnCompany: {
          include: {
            bizUser: true,
          },
        },
      },
      take: limit,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
    });

    return {
      results: companies.map(this.mapBizCompanyToCompany),
      next: companies.length === limit ? companies[companies.length - 1].id : null,
      previous: cursor || null,
    };
  }

  private mapBizCompanyToCompany(bizCompany: any): Company {
    return {
      id: bizCompany.externalId,
      object: 'company',
      attributes: bizCompany.data || {},
      createdAt: bizCompany.createdAt.toISOString(),
    };
  }

  async upsertCompany(data: UpsertCompanyRequestDto, environmentId: string): Promise<Company> {
    const { id, attributes } = data;

    return await this.prisma.$transaction(async (tx) => {
      // Get projectId from environment
      const environment = await tx.environment.findUnique({
        where: { id: environmentId },
      });

      if (!environment) {
        throw new OpenAPIException(
          OpenAPIErrors.COMMON.NOT_FOUND.message,
          HttpStatus.NOT_FOUND,
          OpenAPIErrors.COMMON.NOT_FOUND.code,
        );
      }

      // Upsert company using bizService
      const bizCompany = await this.bizService.upsertBizCompanyAttributes(
        tx,
        environment.projectId,
        environmentId,
        id,
        attributes,
      );

      return this.mapBizCompanyToCompany(bizCompany);
    });
  }

  async deleteCompany(id: string, environmentId: string): Promise<void> {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
        deleted: false,
      },
    });

    if (!bizCompany) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY.NOT_FOUND.code,
      );
    }

    await this.prisma.bizCompany.update({
      where: {
        id: bizCompany.id,
      },
      data: {
        deleted: true,
      },
    });
  }
}
