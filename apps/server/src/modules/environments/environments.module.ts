import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { Module } from '@nestjs/common';
import { EnvironmentsResolver } from './environments.resolver';
import { EnvironmentsService } from './services/environments.service';

@Module({
  imports: [ProjectsModule, CommonModule],
  providers: [EnvironmentsResolver, EnvironmentsService, PermissionGuard],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
