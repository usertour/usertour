import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { QUEUE_AUDIT_LOG } from '@/common/consts/queen';
import { ProjectsModule } from '@/projects/projects.module';
import { AuditInterceptor } from './audit.interceptor';
import { AuditListener } from './audit.listener';
import { AuditProcessor } from './audit.processor';
import { AuditResolver } from './audit.resolver';
import { AuditService } from './audit.service';

/**
 * Audit logging for the open write surface. Global so any module can inject
 * `AuditService` to record a change without importing this module explicitly.
 * The interceptor audits v2 REST writes (gated by `@RequireCapability`); MCP
 * writes are captured in the MCP dispatch wrapper.
 */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_AUDIT_LOG }), ProjectsModule],
  providers: [
    AuditService,
    AuditListener,
    AuditProcessor,
    AuditResolver,
    PermissionGuard,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
