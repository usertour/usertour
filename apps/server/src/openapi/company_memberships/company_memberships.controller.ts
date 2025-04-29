import { Controller, Delete, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { OpenAPICompanyMembershipService } from './company_memberships.service';
import { DeleteCompanyMembershipResponseDto } from './company_memberships.dto';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';

@ApiTags('Company Memberships')
@Controller('v1/company_memberships')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
export class OpenAPICompanyMembershipController {
  constructor(private readonly openAPICompanyMembershipService: OpenAPICompanyMembershipService) {}

  @Delete()
  @ApiOperation({ summary: 'Delete company membership' })
  @ApiQuery({ name: 'user_id', description: 'User ID', required: true })
  @ApiQuery({ name: 'company_id', description: 'Company ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Company membership deleted',
    type: DeleteCompanyMembershipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Company membership not found' })
  async deleteCompanyMembership(
    @Query('user_id') userId: string,
    @Query('company_id') companyId: string,
    @EnvironmentId() environmentId: string,
  ): Promise<DeleteCompanyMembershipResponseDto> {
    return await this.openAPICompanyMembershipService.deleteCompanyMembership(
      userId,
      companyId,
      environmentId,
    );
  }
}
