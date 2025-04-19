import { HttpService } from '@nestjs/axios';
import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('hello/:name')
  @Public()
  getHelloName(@Param('name') name: string): string {
    return this.appService.getHelloName(name);
  }

  @Get('fonts')
  getFonts() {
    return this.httpService.axiosRef.get(
      'https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDesOaG7vNtVH8Wun4VB7KoxF2k4XxD_5I',
    );
  }

  @Get('api/health')
  @Public()
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
