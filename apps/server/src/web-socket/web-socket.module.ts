import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';

@Module({
  imports: [BizModule, IntegrationModule],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
