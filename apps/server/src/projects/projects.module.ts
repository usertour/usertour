import { Module } from '@nestjs/common';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './projects.service';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { LicenseModule } from '@/license/license.module';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [LicenseModule, SharedModule],
  providers: [ProjectsResolver, ProjectsService, PermissionGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
