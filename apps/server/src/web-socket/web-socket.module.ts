import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';
import { LicenseModule } from '@/license/license.module';
import { WebSocketV2Gateway } from './v2/web-socket-v2.gateway';
import { WebSocketV2Service } from './v2/web-socket-v2.service';
import { SharedModule } from '@/shared/shared.module';
import { TrackEventService } from './core/track-event.service';
import { ContentManagementService } from './core/content-management.service';
import { ContentSessionService } from './core/content-session.service';

@Module({
  imports: [BizModule, IntegrationModule, LicenseModule, SharedModule],
  providers: [
    WebSocketGateway,
    WebSocketService,
    WebSocketPerformanceInterceptor,
    WebSocketV2Gateway,
    WebSocketV2Service,
    TrackEventService,
    ContentManagementService,
    ContentSessionService,
  ],
  exports: [WebSocketGateway, WebSocketV2Gateway],
})
export class WebSocketModule {}
