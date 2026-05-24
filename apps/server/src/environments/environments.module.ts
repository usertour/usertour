import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { EnvironmentsResolver } from './environments.resolver';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [EnvironmentsResolver, EnvironmentsService, PermissionGuard],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
