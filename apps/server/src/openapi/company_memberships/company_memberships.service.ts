import { Injectable, Logger } from '@nestjs/common';
import { BizService } from '@/biz/biz.service';
import { DeleteCompanyMembershipResponseDto } from './company_memberships.dto';
import { CompanyMembershipNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/types/openapi';

@Injectable()
export class OpenAPICompanyMembershipService {
  private readonly logger = new Logger(OpenAPICompanyMembershipService.name);

  constructor(private readonly bizService: BizService) {}

  async deleteCompanyMembership(
    userId: string,
    companyId: string,
    environmentId: string,
  ): Promise<DeleteCompanyMembershipResponseDto> {
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
