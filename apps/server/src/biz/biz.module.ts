import { EnvironmentsModule } from '@/environments/environments.module';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { BizGuard } from './biz.guard';
import { BizResolver } from './biz.resolver';
import { BizService } from './biz.service';

@Module({
  imports: [EnvironmentsModule, ProjectsModule],
  providers: [BizResolver, BizService, BizGuard],
})
export class BizModule {}
