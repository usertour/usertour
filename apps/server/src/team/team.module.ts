import { Module } from '@nestjs/common';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';

@Module({
  imports: [],
  providers: [TeamResolver, TeamService],
  exports: [TeamService],
})
export class TeamModule {}
