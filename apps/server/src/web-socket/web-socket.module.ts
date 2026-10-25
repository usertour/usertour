import { Module } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/modules/biz/biz.module';
import { LicenseModule } from '@/modules/license/license.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { WebSocketV2Gateway } from './v2/web-socket-v2.gateway';
import { WebSocketV2Service } from './v2/web-socket-v2.service';
import { WebSocketV2Guard } from './v2/web-socket-v2.guard';
import { WebSocketThrottlerGuard } from './v2/web-socket-throttler.guard';
import { CommonModule } from '@/modules/common/common.module';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { ContentOrchestratorService } from './core/content-orchestrator.service';
import { SocketOperationService } from './core/socket-operation.service';
import { SocketEmitterService } from './core/socket-emitter.service';
import { SocketParallelService } from './core/socket-parallel.service';
import { SocketMessageQueueService } from './core/socket-message-queue.service';
import { RoomSyncService } from './core/room-sync.service';
import { WebSocketMessageValidationPipe } from './v2/web-socket-message-validation.pipe';
import { SocketDataService } from './core/socket-data.service';
import { WebSocketV2MessageHandler } from './v2/web-socket-v2-message-handler';

@Module({
  imports: [DeliveryModule, BizModule, LicenseModule, ProjectsModule, CommonModule, ConfigModule],
  providers: [
    WebSocketGateway,
    WebSocketService,
    WebSocketPerformanceInterceptor,
    WebSocketV2Gateway,
    WebSocketV2Service,
    WebSocketV2Guard,
    // The gateway's rate limits (per socket) are built by the guard itself,
    // not registered through ThrottlerModule: that module is global and holds
    // one options token for the application, which the v2 REST limiter owns.
    // The guard's counters live in this module's own storage instance.
    WebSocketThrottlerGuard,
    ThrottlerStorageService,
    ContentOrchestratorService,
    SocketOperationService,
    SocketEmitterService,
    SocketParallelService,
    SocketMessageQueueService,
    RoomSyncService,
    WebSocketMessageValidationPipe,
    SocketDataService,
    WebSocketV2MessageHandler,
  ],
  // DeliveryModule is re-exported: the api and mcp modules reach the runtime through this module.
  exports: [WebSocketGateway, WebSocketV2Gateway, DeliveryModule],
})
export class WebSocketModule {}
