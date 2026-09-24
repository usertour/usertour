import { Module } from '@nestjs/common';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { TeamResolver } from './resolvers/team.resolver';
import { UserOnProjectResolver } from './resolvers/user-on-project.resolver';
import { TeamService } from './services/team.service';
import { CommonModule } from '@/modules/common/common.module';

@Module({
  imports: [ProjectsModule, CommonModule],
  providers: [TeamResolver, TeamService, UserOnProjectResolver, PermissionGuard],
  exports: [TeamService],
})
export class TeamModule {}
