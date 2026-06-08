import { Controller, Get, Param, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { RequestUrl } from '@/common/decorators/request-url.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { Environment } from '@/environments/models/environment.model';

import { User } from '../../models/user.model';
import { GetUserQueryDto, ListUsersQueryDto } from '../../services/users/users.dto';
import { OpenAPIUsersService } from '../../services/users/users.service';

@ApiTags('Users (v2)')
@Controller('v2/projects/:projectId/environments/:environmentId/users')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIV2UsersController {
  constructor(private readonly openAPIUsersService: OpenAPIUsersService) {}

  @Get()
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'List of users', type: User, isArray: true })
  async listUsers(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListUsersQueryDto,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    return this.openAPIUsersService.listUsers(requestUrl, environment, query);
  }

  @Get(':id')
  @RequireCapability(Capability.BizdataRead)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: GetUserQueryDto,
  ): Promise<User> {
    return this.openAPIUsersService.getUser(id, environment.id, query);
  }
}
