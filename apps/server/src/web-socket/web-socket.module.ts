import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebSocketGateway } from './web-socket.gateway';
import { WebSocketService } from './web-socket.service';
import { WebSocketPerformanceInterceptor } from './web-socket.interceptor';
import { BizModule } from '@/biz/biz.module';
import { IntegrationModule } from '@/integration/integration.module';
import { LicenseModule } from '@/license/license.module';
import { ProjectsModule } from '@/projects/projects.module';
import { WebSocketV2Gateway } from './v2/web-socket-v2.gateway';
import { WebSocketV2Service } from './v2/web-socket-v2.service';
import { WebSocketV2Guard } from './v2/web-socket-v2.guard';
import { WebSocketThrottlerGuard } from './v2/web-socket-throttler.guard';
import { SharedModule } from '@/shared/shared.module';
import { EventTrackingService } from './core/event-tracking.service';
import { ConditionEvaluationService } from './core/condition-evaluation.service';
import { ContentDataService } from './core/content-data.service';
import { SessionBuilderService } from './core/session-builder.service';
import { ContentOrchestratorService } from './core/content-orchestrator.service';
import { SocketOperationService } from './core/socket-operation.service';
import { SocketEmitterService } from './core/socket-emitter.service';
import { SocketParallelService } from './core/socket-parallel.service';
import { SocketMessageQueueService } from './core/socket-message-queue.service';
import { SocketDataService } from './core/socket-data.service';
import { DistributedLockService } from './core/distributed-lock.service';
import { WebSocketV2MessageHandler } from './v2/web-socket-v2-message-handler';

@Module({
  imports: [
    BizModule,
    IntegrationModule,
    LicenseModule,
    ProjectsModule,
    SharedModule,
    ConfigModule,
    // WebSocket rate limiting configuration
    // - short: 30 requests per second per socket (burst protection)
    // - medium: 300 requests per minute per socket (sustained rate limiting)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // Disable HTTP response headers since WebSocket doesn't have HTTP response
        // This prevents "Cannot read properties of undefined (reading 'header')" error
        setHeaders: false,
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('WS_THROTTLE_SHORT_TTL', 1000),
            limit: configService.get<number>('WS_THROTTLE_SHORT_LIMIT', 30),
          },
          {
            name: 'medium',
            ttl: configService.get<number>('WS_THROTTLE_MEDIUM_TTL', 60000),
            limit: configService.get<number>('WS_THROTTLE_MEDIUM_LIMIT', 300),
          },
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    WebSocketGateway,
    WebSocketService,
    WebSocketPerformanceInterceptor,
    WebSocketV2Gateway,
    WebSocketV2Service,
    WebSocketV2Guard,
    WebSocketThrottlerGuard,
    EventTrackingService,
    ConditionEvaluationService,
    ContentDataService,
    SessionBuilderService,
    ContentOrchestratorService,
    SocketOperationService,
    SocketEmitterService,
    SocketParallelService,
    SocketMessageQueueService,
    SocketDataService,
    DistributedLockService,
    WebSocketV2MessageHandler,
  ],
  exports: [WebSocketGateway, WebSocketV2Gateway],
})
export class WebSocketModule {}
