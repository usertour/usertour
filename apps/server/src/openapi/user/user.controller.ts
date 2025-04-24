import { Controller, Get, Param, Query, Request, Put, Body } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ListUsersResponseDto, UpsertUserRequestDto } from './user.dto';
import { OpenapiGuard } from '../openapi.guard';
import { UseGuards } from '@nestjs/common';
import { User } from '../models/user.model';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(OpenapiGuard)
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

  @Put(':id')
  @ApiOperation({ summary: 'Create or update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User created/updated successfully', type: User })
  async upsertUser(
    @Param('id') id: string,
    @Body() data: UpsertUserRequestDto,
    @Request() req,
  ): Promise<User> {
    return await this.userService.upsertUser(id, data, req.environment.id);
  }
}
