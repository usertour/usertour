import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/projects/projects.module';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';
import { TeamGuard } from './team.guard';

@Module({
  imports: [ProjectsModule],
  providers: [TeamResolver, TeamService, TeamGuard],
  exports: [TeamService],
})
export class TeamModule {}
