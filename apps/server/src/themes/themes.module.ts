import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { ThemesGuard } from '@/themes/themes.guard';
import { ThemesResolver } from '@/themes/themes.resolver';
import { ThemesService } from '@/themes/themes.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [ThemesResolver, ThemesService, ThemesGuard],
  exports: [ThemesService],
})
export class ThemesModule {}
