import { EnvironmentsModule } from '@/modules/environments/environments.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { Module } from '@nestjs/common';
import { BizResolver } from './biz.resolver';
import { BizService } from './services/biz.service';

@Module({
  imports: [EnvironmentsModule, ProjectsModule, CommonModule],
  providers: [BizResolver, BizService, PermissionGuard],
  exports: [BizService],
})
export class BizModule {}
