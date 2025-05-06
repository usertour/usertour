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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OpenAPIUsersService } from './users.service';
import { UpsertUserRequestDto, ExpandType, ListUsersQueryDto, GetUserQueryDto } from './users.dto';
import { OpenAPIKeyGuard } from '../openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EnvironmentId } from '@/common/decorators/environment-id.decorator';
import { User } from '../models/user.model';
import { EnvironmentDecorator } from '@/common/decorators/environment.decorator';
import { Environment } from '@/environments/models/environment.model';
import { RequestUrl } from '@/common/decorators/request-url.decorator';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(OpenAPIKeyGuard)
@UseFilters(OpenAPIExceptionFilter)
@ApiBearerAuth()
export class OpenAPIUsersController {
  constructor(private readonly openAPIUsersService: OpenAPIUsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiQuery({ name: 'expand', required: false, enum: ExpandType, isArray: true })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @EnvironmentId() environmentId: string,
    @Query() query: GetUserQueryDto,
  ): Promise<User> {
    return this.openAPIUsersService.getUser(id, environmentId, query);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: User, isArray: true })
  async listUsers(
    @RequestUrl() requestUrl: string,
    @EnvironmentDecorator() environment: Environment,
    @Query() query: ListUsersQueryDto,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    return this.openAPIUsersService.listUsers(requestUrl, environment, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a user' })
  @ApiResponse({ status: 200, description: 'User created/updated successfully' })
  async upsertUser(@Body() data: UpsertUserRequestDto, @EnvironmentId() environmentId: string) {
    return await this.openAPIUsersService.upsertUser(data, environmentId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string, @EnvironmentId() environmentId: string) {
    return await this.openAPIUsersService.deleteUser(id, environmentId);
  }
}
