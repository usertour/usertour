import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { ThemesResolver } from './themes.resolver';
import { ThemesService } from './services/themes.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [ThemesResolver, ThemesService, PermissionGuard],
  exports: [ThemesService],
})
export class ThemesModule {}
