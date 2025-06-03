import { Post, Body, Param, Controller } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller('api')
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(private readonly integrationService: IntegrationService) {}

  @Post('mixpanel_webhook/:accessToken')
  @Public()
  async mixpanelWebhook(@Body() body: any, @Param('accessToken') accessToken: string) {
    return this.integrationService.syncCohort(accessToken, body);
  }
}
