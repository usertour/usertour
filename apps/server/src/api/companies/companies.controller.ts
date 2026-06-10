import { Controller, Get, Param, Query, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import { ApiValidationPipe } from '../shared/validation.pipe';
import { ApiCompaniesService } from './companies.service';
import {
  CompanyDto,
  GetCompanyQueryDto,
  ListCompaniesQueryDto,
  ListCompaniesResponseDto,
} from './companies.schema';

@ApiTags('Companies (v2)')
@Controller('v2/projects/:projectId/environments/:environmentId/companies')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiCompaniesController {
  constructor(private readonly service: ApiCompaniesService) {}

  @Get()
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'List companies' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'List of companies', type: ListCompaniesResponseDto })
  async list(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListCompaniesQueryDto,
  ) {
    return this.service.list(requestUrl, environment.id, query);
  }

  @Get(':id')
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'Get a company' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Company external ID' })
  @ApiResponse({ status: 200, description: 'Company found', type: CompanyDto })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async get(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetCompanyQueryDto,
  ) {
    return this.service.getCompany(id, environment.id, query);
  }
}
