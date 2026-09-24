import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { SocketDataService } from './core/socket-data.service';
import { WebSocketV2MessageHandler } from './v2/web-socket-v2-message-handler';

@Module({
  imports: [
    DeliveryModule,
    BizModule,
    LicenseModule,
    ProjectsModule,
    CommonModule,
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
            // Number(...) is load-bearing: env values are STRINGS, and the
            // throttler storage computes `Date.now() + ttl` — string concat
            // would push expiry out ~5.6M years and the window would never
            // reset (same latent bug the v2 API limiter shipped and fixed).
            ttl: Number(configService.get('WS_THROTTLE_SHORT_TTL') ?? 1000),
            limit: Number(configService.get('WS_THROTTLE_SHORT_LIMIT') ?? 30),
          },
          {
            name: 'medium',
            ttl: Number(configService.get('WS_THROTTLE_MEDIUM_TTL') ?? 60000),
            limit: Number(configService.get('WS_THROTTLE_MEDIUM_LIMIT') ?? 300),
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
    ContentOrchestratorService,
    SocketOperationService,
    SocketEmitterService,
    SocketParallelService,
    SocketMessageQueueService,
    SocketDataService,
    WebSocketV2MessageHandler,
  ],
  // DeliveryModule is re-exported: the api and mcp modules reach the runtime through this module.
  exports: [WebSocketGateway, WebSocketV2Gateway, DeliveryModule],
})
export class WebSocketModule {}
