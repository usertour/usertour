import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/projects/projects.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { TeamResolver } from './team.resolver';
import { TeamService } from './team.service';
import { UserOnProjectResolver } from './useronproject.resolver';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [TeamResolver, TeamService, UserOnProjectResolver, PermissionGuard],
  exports: [TeamService],
})
export class TeamModule {}
