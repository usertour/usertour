import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';

@Module({
  imports: [BizModule, IntegrationModule],
  providers: [WebSocketGateway, WebSocketService, WebSocketPerformanceInterceptor],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
