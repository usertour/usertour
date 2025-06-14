import { Post, Body, Param, Controller, Get, Query, Redirect } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { MixpanelWebhookDto } from './integration.dto';
import { ConfigService } from '@nestjs/config';

@Controller('api')
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly configService: ConfigService,
  ) {}

  @Post('mixpanel_webhook/:accessToken')
  @Public()
  async mixpanelWebhook(
    @Body() body: MixpanelWebhookDto,
    @Param('accessToken') accessToken: string,
  ) {
    return this.integrationService.syncCohort(accessToken, body);
  }

  @Get('integration/salesforce/callback')
  @Public()
  @Redirect()
  async handleSalesforceCallback(@Query('code') code: string, @Query('state') state: string) {
    const baseUrl = this.configService.get('app.homepageUrl');
    try {
      const integration = await this.integrationService.handleSalesforceCallback(code, state);
      return { url: `${baseUrl}/project/1/settings/integrations/${integration.provider}` };
    } catch (error) {
      this.logger.error('Salesforce callback error:', error);
      return {
        url: `${baseUrl}/project/1/settings/integrations/?failed=true`,
      };
    }
  }
}
