import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getBizUser(@Param('id') id: string) {
    return this.userService.get(id);
  }
}
