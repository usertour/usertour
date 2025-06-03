import { Get, Body, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get('api/mixpanel_webhook/:key')
  @Public()
  async mixpanelWebhook(@Body() body: any, @Param('key') key: string) {
    console.log(body);
    console.log(key);
  }
}
