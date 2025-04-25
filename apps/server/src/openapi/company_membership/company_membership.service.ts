import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { DeleteCompanyMembershipResponseDto } from './company_membership.dto';

@Injectable()
export class CompanyMembershipService {
  private readonly logger = new Logger(CompanyMembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deleteCompanyMembership(
    userId: string,
    companyId: string,
    environmentId: string,
  ): Promise<DeleteCompanyMembershipResponseDto> {
    const membership = await this.prisma.bizUserOnCompany.findFirst({
      where: {
        bizUser: {
          externalId: userId,
          environmentId,
        },
        bizCompany: {
          externalId: companyId,
          environmentId,
        },
      },
    });

    if (!membership) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY_MEMBERSHIP.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY_MEMBERSHIP.NOT_FOUND.code,
      );
    }

    await this.prisma.bizUserOnCompany.delete({
      where: {
        id: membership.id,
      },
    });

    return {
      id: membership.id,
      object: 'company_membership',
      deleted: true,
    };
  }
}
