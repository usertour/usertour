import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('hello/:name')
  @Public()
  getHelloName(@Param('name') name: string): string {
    return this.appService.getHelloName(name);
  }
}
