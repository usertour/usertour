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
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { ListCompaniesResponseDto, UpsertCompanyRequestDto } from './company.dto';
import { OpenapiGuard } from '../openapi.guard';
import { Company } from '../models/company.model';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';

@ApiTags('Companies')
@Controller('v1/companies')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company found', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompany(@Param('id') id: string, @Request() req): Promise<Company> {
    return await this.companyService.getCompany(id, req.environment.id);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'List of companies', type: ListCompaniesResponseDto })
  async listCompanies(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 20,
  ): Promise<ListCompaniesResponseDto> {
    return await this.companyService.listCompanies(req.environment.id, cursor, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a company' })
  @ApiResponse({ status: 200, description: 'Company created/updated successfully', type: Company })
  async upsertCompany(@Body() data: UpsertCompanyRequestDto, @Request() req): Promise<Company> {
    return await this.companyService.upsertCompany(data, req.environment.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  async deleteCompany(@Param('id') id: string, @Request() req): Promise<void> {
    return await this.companyService.deleteCompany(id, req.environment.id);
  }
}
