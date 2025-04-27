import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OpenapiGuard } from '../openapi.guard';
import { AttributeService } from './attribute.service';
import { ListAttributesResponseDto } from './attribute.dto';
import { Environment } from '@/environments/models/environment.model';
import { EnvironmentDecorator } from '../decorators/environment.decorator';

@ApiTags('Attributes')
@Controller('v1/attributes')
@UseGuards(OpenapiGuard)
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Get()
  @ApiOperation({ summary: 'List attributes' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listAttributes(
    @EnvironmentDecorator() environment: Environment,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<ListAttributesResponseDto> {
    return this.attributeService.listAttributes(environment.projectId, cursor, limit);
  }
}
