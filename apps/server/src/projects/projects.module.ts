import { Module } from '@nestjs/common';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './projects.service';
import { LicenseModule } from '@/license/license.module';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [LicenseModule, SharedModule],
  providers: [ProjectsResolver, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
