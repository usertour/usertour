import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketGatewayV2 } from './web-socket.gateway-v2';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';
import { LicenseModule } from '@/license/license.module';

@Module({
  imports: [BizModule, IntegrationModule, LicenseModule],
  providers: [
    WebSocketGateway,
    WebSocketGatewayV2,
    WebSocketService,
    WebSocketPerformanceInterceptor,
  ],
  exports: [WebSocketGateway, WebSocketGatewayV2],
})
export class WebSocketModule {}
