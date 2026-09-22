import { Controller, Delete, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/modules/common/filters/openapi-exception.filter';
import { Audit } from '@/modules/audit/decorators/audit.decorator';
import { OpenAPICompanyMembershipsService } from './company-memberships.service';
import { EnvironmentId } from '../shared/environment-id.decorator';
import { DeleteResponseDto } from '../shared/delete-response.dto';
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
