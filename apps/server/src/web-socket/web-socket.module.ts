import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';
import { LicenseModule } from '@/license/license.module';
import { WebSocketGatewayV2 } from './web-socket.gateway-v2';

@Module({
  imports: [BizModule, IntegrationModule, LicenseModule],
  providers: [
    WebSocketGateway,
    WebSocketService,
    WebSocketPerformanceInterceptor,
    WebSocketGatewayV2,
  ],
  exports: [WebSocketGateway, WebSocketGatewayV2],
})
export class WebSocketModule {}
