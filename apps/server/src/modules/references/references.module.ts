import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { Module } from '@nestjs/common';
import { ReferencesResolver } from './references.resolver';
import { ReferencesService } from './services/references.service';

/**
 * Reverse references between content and the definitions it uses by id
 * (ADR 0016): the in-use guard every definition delete runs, the
 * deleted-reference check publish runs, and the list a delete dialog shows.
 */
@Module({
  imports: [ProjectsModule],
  providers: [ReferencesResolver, ReferencesService, PermissionGuard],
  exports: [ReferencesService],
})
export class ReferencesModule {}
