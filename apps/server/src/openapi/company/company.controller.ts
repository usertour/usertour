import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Body,
  UseFilters,
  UseGuards,
  Delete,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { ListCompaniesResponseDto, UpsertCompanyRequestDto, ExpandType } from './company.dto';
import { OpenapiGuard } from '../openapi.guard';
import { Company } from '../models/company.model';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { EnvironmentDecorator } from '../decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';

@ApiTags('Companies')
@Controller('v1/companies')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'Company found', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompany(
    @Param('id') id: string,
    @Request() req,
    @Query('expand') expand?: string,
  ): Promise<Company> {
    const expandTypes = expand ? (expand.split(',') as ExpandType[]) : undefined;
    return await this.companyService.getCompany(id, req.environment.id, expandTypes);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'List of companies', type: ListCompaniesResponseDto })
  async listCompanies(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 20,
    @Query('expand') expand?: string,
  ): Promise<ListCompaniesResponseDto> {
    const expandTypes = expand ? (expand.split(',') as ExpandType[]) : undefined;
    return await this.companyService.listCompanies(req.environment.id, cursor, limit, expandTypes);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a company' })
  @ApiResponse({ status: 200, description: 'Company created/updated successfully', type: Company })
  async upsertCompany(
    @Body() data: UpsertCompanyRequestDto,
    @EnvironmentDecorator() environment: Environment,
  ): Promise<Company> {
    return await this.companyService.upsertCompany(data, environment.id, environment.projectId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  async deleteCompany(@Param('id') id: string, @Request() req): Promise<void> {
    return await this.companyService.deleteCompany(id, req.environment.id);
  }
}
