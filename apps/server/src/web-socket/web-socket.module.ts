import { Module } from '@nestjs/common';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';
import { LicenseModule } from '@/license/license.module';
import { WebSocketV2Gateway } from './v2/web-socket-v2.gateway';
import { WebSocketV2Service } from './v2/web-socket-v2.service';
import { WebSocketV2Guard } from './v2/web-socket-v2.guard';
import { SharedModule } from '@/shared/shared.module';
import { EventTrackingService } from './core/event-tracking.service';
import { DataResolverService } from './core/data-resolver.service';
import { SessionBuilderService } from './core/session-builder.service';
import { ContentOrchestratorService } from './core/content-orchestrator.service';
import { SocketSessionService } from './core/socket-session.service';
import { SocketRedisService } from './core/socket-redis.service';
import { SocketEmitterService } from './core/socket-emitter.service';
import { SocketParallelService } from './core/socket-parallel.service';
import { DistributedLockService } from './core/distributed-lock.service';
import { SocketMessageQueueService } from './core/socket-message-queue.service';
import { WebSocketV2MessageHandler } from './v2/web-socket-v2-message-handler';

@Module({
  imports: [BizModule, IntegrationModule, LicenseModule, SharedModule],
  providers: [
    WebSocketGateway,
    WebSocketService,
    WebSocketPerformanceInterceptor,
    WebSocketV2Gateway,
    WebSocketV2Service,
    WebSocketV2Guard,
    EventTrackingService,
    DataResolverService,
    SessionBuilderService,
    ContentOrchestratorService,
    SocketSessionService,
    SocketRedisService,
    SocketEmitterService,
    SocketParallelService,
    DistributedLockService, // Kept for potential future use
    SocketMessageQueueService,
    WebSocketV2MessageHandler,
  ],
  exports: [WebSocketGateway, WebSocketV2Gateway],
})
export class WebSocketModule {}
