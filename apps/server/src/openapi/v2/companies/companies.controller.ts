import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import { Company } from '../../models/company.model';
import {
  GetCompanyQueryDto,
  ListCompaniesQueryDto,
  ListCompaniesResponseDto,
} from '../../services/companies/companies.dto';
import { OpenAPICompaniesService } from '../../services/companies/companies.service';

@ApiTags('Companies (v2)')
@Controller('v2/projects/:projectId/environments/:environmentId/companies')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIV2CompaniesController {
  constructor(private readonly openAPICompaniesService: OpenAPICompaniesService) {}

  @Get()
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'List of companies', type: ListCompaniesResponseDto })
  async listCompanies(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListCompaniesQueryDto,
  ): Promise<ListCompaniesResponseDto> {
    return this.openAPICompaniesService.listCompanies(requestUrl, environment, query);
  }

  @Get(':id')
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company found', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompany(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetCompanyQueryDto,
  ): Promise<Company> {
    return this.openAPICompaniesService.getCompany(id, environment, query);
  }
}
