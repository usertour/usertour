import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/projects/projects.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';
import { UserOnProjectResolver } from './useronproject.resolver';

@Module({
  imports: [ProjectsModule],
  providers: [TeamResolver, TeamService, UserOnProjectResolver, PermissionGuard],
  exports: [TeamService],
})
export class TeamModule {}
