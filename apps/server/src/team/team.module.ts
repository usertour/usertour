import { Module } from '@nestjs/common';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';
import { TeamGuard } from './team.guard';

@Module({
  imports: [],
  providers: [TeamResolver, TeamService, TeamGuard],
  exports: [TeamService],
})
export class TeamModule {}
