import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
import { ApiWebhooksService } from './webhooks.service';
import {
  CreateWebhookBodyDto,
  ListWebhooksQueryDto,
  ListWebhooksResponseDto,
  UpdateWebhookBodyDto,
  WebhookDto,
} from './webhooks.schema';

@ApiTags('Webhooks')
@Controller('v2/projects/:projectId/environments/:environmentId/webhooks')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiWebhooksController {
  constructor(private readonly service: ApiWebhooksService) {}

  @Get()
  @RequireCapability(Capability.WebhookRead)
  @ApiOperation({ summary: 'List webhooks' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'List of webhooks', type: ListWebhooksResponseDto })
  async list(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListWebhooksQueryDto,
  ) {
    return this.service.list(requestUrl, environment, query);
  }

  @Get(':id')
  @RequireCapability(Capability.WebhookRead)
  @ApiOperation({ summary: 'Get a webhook (includes the signing secret)' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook found', type: WebhookDto })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async get(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    return this.service.get(id, environment);
  }

  @Post()
  @RequireCapability(Capability.WebhookManage)
  @ApiOperation({ summary: 'Create a webhook' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 201, description: 'Webhook created', type: WebhookDto })
  async create(
    @EnvironmentDecorator() environment: Environment,
    @Body() body: CreateWebhookBodyDto,
  ) {
    return this.service.create(environment, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.WebhookManage)
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook updated', type: WebhookDto })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async update(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Body() body: UpdateWebhookBodyDto,
  ) {
    return this.service.update(id, environment, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.WebhookManage)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async remove(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    await this.service.delete(id, environment);
  }

  @Post(':id/rotate-secret')
  @RequireCapability(Capability.WebhookManage)
  @ApiOperation({ summary: 'Rotate the signing secret' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 201, description: 'Secret rotated', type: WebhookDto })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async rotateSecret(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    return this.service.rotateSecret(id, environment);
  }
}
