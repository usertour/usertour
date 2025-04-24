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
import { UserService } from './user.service';
import { ListUsersResponseDto, UpsertUserRequestDto } from './user.dto';
import { OpenapiGuard } from '../openapi.guard';
import { User } from '../models/user.model';
import { OpenAPIExceptionFilter } from '../filters/openapi-exception.filter';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(OpenapiGuard)
@UseFilters(OpenAPIExceptionFilter)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string, @Request() req): Promise<User> {
    return await this.userService.getUser(id, req.environment.id);
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'List of users', type: ListUsersResponseDto })
  async listUsers(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 20,
  ): Promise<ListUsersResponseDto> {
    return await this.userService.listUsers(req.environment.id, cursor, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a user' })
  @ApiResponse({ status: 200, description: 'User created/updated successfully', type: User })
  async upsertUser(@Body() data: UpsertUserRequestDto, @Request() req): Promise<User> {
    return await this.userService.upsertUser(data, req.environment.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string, @Request() req): Promise<void> {
    return await this.userService.deleteUser(id, req.environment.id);
  }
}
