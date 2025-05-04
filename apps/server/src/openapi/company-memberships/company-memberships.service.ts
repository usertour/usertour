import { Injectable, Logger } from '@nestjs/common';
import { BizService } from '@/biz/biz.service';
import { CompanyMembershipNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { DeleteResponseDto } from '@/common/openapi/dtos';

@Injectable()
export class OpenAPICompanyMembershipsService {
  private readonly logger = new Logger(OpenAPICompanyMembershipsService.name);

  constructor(private readonly bizService: BizService) {}

  async deleteCompanyMembership(
    userId: string,
    companyId: string,
    environmentId: string,
  ): Promise<DeleteResponseDto> {
    const membership = await this.bizService.getBizCompanyMembership(
      userId,
      companyId,
      environmentId,
    );
    if (!membership) {
      throw new CompanyMembershipNotFoundError();
    }
    await this.bizService.deleteBizCompanyMembership(membership.id);

    return {
      id: membership.id,
      object: OpenApiObjectType.COMPANY_MEMBERSHIP,
      deleted: true,
    };
  }
}
