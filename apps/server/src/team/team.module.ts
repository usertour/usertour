import { Module } from '@nestjs/common';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';
import { TeamGuard } from './team.guard';
import { EmailConfigGuard } from '@/common/guards/email-config.guard';

@Module({
  imports: [],
  providers: [TeamResolver, TeamService, TeamGuard, EmailConfigGuard],
  exports: [TeamService],
})
export class TeamModule {}
