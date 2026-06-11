import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
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
  UpsertCompanyBodyDto,
  UpsertMembershipBodyDto,
} from './companies.schema';

@ApiTags('Companies')
@Controller('v2/projects/:projectId/environments/:environmentId/companies')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiCompaniesController {
  constructor(private readonly service: ApiCompaniesService) {}

  @Get()
  @RequireCapability(Capability.CompanyRead)
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
  @RequireCapability(Capability.CompanyRead)
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

  @Put(':id')
  @RequireCapability(Capability.CompanyWrite)
  @ApiOperation({ summary: 'Create or update a company' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Company external ID' })
  @ApiResponse({ status: 200, description: 'Company created or updated', type: CompanyDto })
  async upsert(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Body() body: UpsertCompanyBodyDto,
  ) {
    return this.service.upsert(id, environment, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.CompanyDelete)
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Company external ID' })
  @ApiResponse({ status: 204, description: 'Company deleted' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    await this.service.delete(id, environment);
  }

  @Put(':id/memberships/:userId')
  @HttpCode(204)
  @RequireCapability(Capability.CompanyWrite)
  @ApiOperation({ summary: 'Add or update a company membership' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Company external ID' })
  @ApiParam({ name: 'userId', description: 'User external ID' })
  @ApiResponse({ status: 204, description: 'Membership created or updated' })
  @ApiResponse({ status: 404, description: 'Company or user not found' })
  async upsertMembership(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @EnvironmentDecorator() environment: Environment,
    @Body() body: UpsertMembershipBodyDto,
  ) {
    await this.service.upsertMembership(id, userId, environment, body);
  }

  @Delete(':id/memberships/:userId')
  @HttpCode(204)
  @RequireCapability(Capability.CompanyWrite)
  @ApiOperation({ summary: 'Remove a company membership' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Company external ID' })
  @ApiParam({ name: 'userId', description: 'User external ID' })
  @ApiResponse({ status: 204, description: 'Membership removed' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async removeMembership(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @EnvironmentDecorator() environment: Environment,
  ) {
    await this.service.deleteMembership(id, userId, environment);
  }
}
