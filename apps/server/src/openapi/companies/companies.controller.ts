import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  UseFilters,
  UseGuards,
  Delete,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPICompaniesService } from './companies.service';
import {
  ListCompaniesResponseDto,
  UpsertCompanyRequestDto,
  ListCompaniesQueryDto,
  GetCompanyQueryDto,
} from './companies.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { Company } from '../models/company.model';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { DeleteResponseDto } from '@/common/openapi/dtos';

@ApiTags('Companies')
@Controller('v1/companies')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPICompaniesController {
  constructor(private readonly openAPICompaniesService: OpenAPICompaniesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company found', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompany(
    @EnvironmentDecorator() environment: Environment,
    @Param('id') id: string,
    @Query() query: GetCompanyQueryDto,
  ): Promise<Company> {
    return await this.openAPICompaniesService.getCompany(id, environment, query);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'List of companies', type: ListCompaniesResponseDto })
  async listCompanies(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListCompaniesQueryDto,
  ): Promise<ListCompaniesResponseDto> {
    return await this.openAPICompaniesService.listCompanies(requestUrl, environment, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a company' })
  @ApiResponse({ status: 200, description: 'Company created/updated successfully', type: Company })
  async upsertCompany(
    @EnvironmentDecorator() environment: Environment,
    @Body() data: UpsertCompanyRequestDto,
  ): Promise<Company> {
    return await this.openAPICompaniesService.upsertCompany(
      data,
      environment.id,
      environment.projectId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Company deleted successfully',
    type: DeleteResponseDto,
  })
  async deleteCompany(
    @EnvironmentDecorator() environment: Environment,
    @Param('id') id: string,
  ): Promise<DeleteResponseDto> {
    return await this.openAPICompaniesService.deleteCompany(id, environment.id);
  }
}
