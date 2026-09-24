import { ContentModule } from '@/modules/content/content.module';
import { EnvironmentsModule } from '@/modules/environments/environments.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { Module } from '@nestjs/common';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [ContentModule, ProjectsModule, EnvironmentsModule],
  providers: [AnalyticsResolver, AnalyticsService, PermissionGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
