import { EnvironmentsModule } from '@/environments/environments.module';
import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { Module } from '@nestjs/common';
import { BizResolver } from './biz.resolver';
import { BizService } from './biz.service';

@Module({
  imports: [EnvironmentsModule, ProjectsModule, SharedModule],
  providers: [BizResolver, BizService, PermissionGuard],
  exports: [BizService],
})
export class BizModule {}
