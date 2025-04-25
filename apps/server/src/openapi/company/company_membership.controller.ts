import { Controller, Delete, Query, Request, UseFilters, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenapiGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { CompanyMembershipService } from './company_membership.service';
import { DeleteCompanyMembershipResponseDto } from './company_membership.dto';

@ApiTags('Company Memberships')
@Controller('v1/company_memberships')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
export class CompanyMembershipController {
  constructor(private readonly companyMembershipService: CompanyMembershipService) {}

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
    @Request() req,
  ): Promise<DeleteCompanyMembershipResponseDto> {
    return await this.companyMembershipService.deleteCompanyMembership(
      userId,
      companyId,
      req.environment.id,
    );
  }
}
