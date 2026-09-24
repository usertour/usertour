import { Module } from '@nestjs/common';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './services/projects.service';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { LicenseModule } from '@/modules/license/license.module';
import { CommonModule } from '@/modules/common/common.module';

@Module({
  imports: [LicenseModule, CommonModule],
  providers: [ProjectsResolver, ProjectsService, PermissionGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
