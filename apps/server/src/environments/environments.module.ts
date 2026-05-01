import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { EnvironmentsGuard } from './environments.guard';
import { EnvironmentsResolver } from './environments.resolver';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [EnvironmentsResolver, EnvironmentsService, EnvironmentsGuard],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
