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
  DefaultValuePipe,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OpenAPICompaniesService } from './companies.service';
import { ListCompaniesResponseDto, UpsertCompanyRequestDto, ExpandType } from './companies.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { Company } from '../models/company.model';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';

@ApiTags('Companies')
@Controller('v1/companies')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPICompaniesController {
  constructor(private readonly companyService: OpenAPICompaniesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'Company found', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompany(
    @EnvironmentDecorator() environment: Environment,
    @Param('id') id: string,
    @Query('expand', new ParseArrayPipe({ optional: true, items: String })) expand?: ExpandType[],
  ): Promise<Company> {
    return await this.companyService.getCompany(id, environment.id, expand);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'List of companies', type: ListCompaniesResponseDto })
  async listCompanies(
    @EnvironmentDecorator() environment: Environment,
    @Query('limit', new DefaultValuePipe(20)) limit: number,
    @Query('cursor') cursor?: string,
    @Query('expand', new ParseArrayPipe({ optional: true, items: String })) expand?: ExpandType[],
  ): Promise<ListCompaniesResponseDto> {
    return await this.companyService.listCompanies(environment.id, limit, cursor, expand);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a company' })
  @ApiResponse({ status: 200, description: 'Company created/updated successfully', type: Company })
  async upsertCompany(
    @EnvironmentDecorator() environment: Environment,
    @Body() data: UpsertCompanyRequestDto,
  ): Promise<Company> {
    return await this.companyService.upsertCompany(data, environment.id, environment.projectId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  async deleteCompany(
    @EnvironmentDecorator() environment: Environment,
    @Param('id') id: string,
  ): Promise<void> {
    return await this.companyService.deleteCompany(id, environment.id);
  }
}
