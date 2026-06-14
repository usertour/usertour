import { Controller, Delete, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Audit } from '@/audit/audit.decorator';
import { OpenAPICompanyMembershipsService } from './company-memberships.service';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';
import { DeleteResponseDto } from '@/common/openapi/dtos';
import { DeleteCompanyMembershipQueryDto } from './company-memberships.dto';

@ApiTags('Company Memberships (v1)')
@Controller('v1/company-memberships')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
export class OpenAPICompanyMembershipsController {
  constructor(
    private readonly openAPICompanyMembershipsService: OpenAPICompanyMembershipsService,
  ) {}

  @Delete()
  @Audit({
    action: 'delete',
    resourceType: 'companyMember',
    resourceId: (req) => `${String(req.query?.userId)}:${String(req.query?.companyId)}`,
  })
  @ApiOperation({ summary: 'Delete company membership' })
  @ApiResponse({
    status: 200,
    description: 'Company membership deleted',
    type: DeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Company membership not found' })
  async deleteCompanyMembership(
    @Query() query: DeleteCompanyMembershipQueryDto,
    @EnvironmentId() environmentId: string,
  ): Promise<DeleteResponseDto> {
    return await this.openAPICompanyMembershipsService.deleteCompanyMembership(
      environmentId,
      query,
    );
  }
}
