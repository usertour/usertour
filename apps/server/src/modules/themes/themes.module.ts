import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { ReferencesModule } from '@/modules/references/references.module';
import { ThemesResolver } from './themes.resolver';
import { ThemesService } from './services/themes.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProjectsModule, CommonModule, ReferencesModule],
  providers: [ThemesResolver, ThemesService, PermissionGuard],
  exports: [ThemesService],
})
export class ThemesModule {}
