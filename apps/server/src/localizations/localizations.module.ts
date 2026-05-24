import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { LocalizationsResolver } from './localizations.resolver';
import { LocalizationsService } from './localizations.service';

@Module({
  imports: [ProjectsModule],
  providers: [LocalizationsResolver, LocalizationsService, PermissionGuard],
  exports: [LocalizationsService],
})
export class LocalizationsModule {}
