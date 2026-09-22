import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { ThemesResolver } from './themes.resolver';
import { ThemesService } from './services/themes.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProjectsModule, CommonModule],
  providers: [ThemesResolver, ThemesService, PermissionGuard],
  exports: [ThemesService],
})
export class ThemesModule {}
