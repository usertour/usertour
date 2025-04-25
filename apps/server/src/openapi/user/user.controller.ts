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
import { UserService } from './user.service';
import { ListUsersResponseDto, UpsertUserRequestDto } from './user.dto';
import { OpenapiGuard } from '../openapi.guard';
import { User } from '../models/user.model';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';
import { EnvironmentId } from '../decorators/environment-id.decorator';
import { ExpandType } from './user.dto';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query('expand') expand?: string,
  ): Promise<User> {
    const expandTypes = expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined;
    return this.userService.getUser(id, environmentId, expandTypes);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: ListUsersResponseDto })
  async listUsers(
    @EnvironmentId() environmentId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('expand') expand?: string,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    const expandTypes = expand ? expand.split(',').map((e) => e.trim() as ExpandType) : undefined;
    return this.userService.listUsers(environmentId, cursor, limit, expandTypes);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a user' })
  @ApiResponse({ status: 200, description: 'User created/updated successfully', type: User })
  async upsertUser(
    @Body() data: UpsertUserRequestDto,
    @EnvironmentId() environmentId: string,
  ): Promise<User> {
    return await this.userService.upsertUser(data, environmentId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string, @EnvironmentId() environmentId: string): Promise<void> {
    return await this.userService.deleteUser(id, environmentId);
  }
}
