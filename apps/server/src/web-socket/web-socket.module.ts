import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { BizModule } from '@/biz/biz.module';

@Module({
  imports: [BizModule],
  providers: [WebSocketGateway, WebSocketService],
})
export class WebSocketModule {}
