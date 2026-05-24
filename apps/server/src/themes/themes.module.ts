import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { ThemesResolver } from '@/themes/themes.resolver';
import { ThemesService } from '@/themes/themes.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [ThemesResolver, ThemesService, PermissionGuard],
  exports: [ThemesService],
})
export class ThemesModule {}
