import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAPIUsersService } from './users.service';
import { UpsertUserRequestDto, ExpandTypes } from './users.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIUsersController {
  constructor(private readonly openapiUsersService: OpenAPIUsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query('expand') expand?: string,
  ) {
    const expandTypes = expand
      ? expand.split(',').map((e) => e.trim() as ExpandTypes[number])
      : undefined;
    return await this.openapiUsersService.getUser(id, environmentId, expandTypes);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async listUsers(
    @EnvironmentId() environmentId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('expand') expand?: string,
  ) {
    const expandTypes = expand
      ? expand.split(',').map((e) => e.trim() as ExpandTypes[number])
      : undefined;
    return await this.openapiUsersService.listUsers(environmentId, cursor, limit, expandTypes);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a user' })
  @ApiResponse({ status: 200, description: 'User created/updated successfully' })
  async upsertUser(@Body() data: UpsertUserRequestDto, @EnvironmentId() environmentId: string) {
    return await this.openapiUsersService.upsertUser(data, environmentId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string, @EnvironmentId() environmentId: string) {
    return await this.openapiUsersService.deleteUser(id, environmentId);
  }
}
