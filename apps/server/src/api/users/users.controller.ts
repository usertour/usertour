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
import { ApiUsersService } from './users.service';
import {
  GetUserQueryDto,
  ListUsersQueryDto,
  ListUsersResponseDto,
  UpsertUserBodyDto,
  UserDto,
} from './users.schema';

@ApiTags('Users')
@Controller('v2/projects/:projectId/environments/:environmentId/users')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiUsersController {
  constructor(private readonly service: ApiUsersService) {}

  @Get()
  @RequireCapability(Capability.UserRead)
  @ApiOperation({ summary: 'List users' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiResponse({ status: 200, description: 'List of users', type: ListUsersResponseDto })
  async list(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.service.list(requestUrl, environment, query);
  }

  @Get(':id')
  @RequireCapability(Capability.UserRead)
  @ApiOperation({ summary: 'Get a user' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'User external ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async get(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetUserQueryDto,
  ) {
    return this.service.getUser(id, environment.id, query);
  }

  @Put(':id')
  @RequireCapability(Capability.UserWrite)
  @ApiOperation({ summary: 'Create or update a user' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'User external ID' })
  @ApiResponse({ status: 200, description: 'User created or updated', type: UserDto })
  async upsert(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Body() body: UpsertUserBodyDto,
  ) {
    return this.service.upsert(id, environment, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.UserDelete)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  @ApiParam({ name: 'id', description: 'User external ID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @EnvironmentDecorator() environment: Environment) {
    await this.service.delete(id, environment);
  }
}
