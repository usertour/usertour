import { Controller, Get, Query, UseGuards, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Environment } from '@/environments/models/environment.model';
import { OpenAPIAttributesService } from './attributes.service';
import { ListAttributesDto } from './attributes.dto';
import { OpenapiGuard } from '@/openapi/openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';

@ApiTags('Attributes')
@Controller('v1/attributes')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIAttributesController {
  constructor(private readonly attributesService: OpenAPIAttributesService) {}

  @Get()
  @ApiOperation({ summary: 'List attributes' })
  async listAttributes(
    @EnvironmentDecorator() environment: Environment,
    @Query() dto: ListAttributesDto,
  ) {
    return this.attributesService.listAttributes(environment.projectId, dto);
  }
}
