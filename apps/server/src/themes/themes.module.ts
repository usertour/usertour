import { Module } from "@nestjs/common";
import { ThemesResolver } from "@/themes/themes.resolver";
import { ThemesService } from "@/themes/themes.service";
import { ThemesGuard } from "@/themes/themes.guard";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  imports: [ProjectsModule],
  providers: [ThemesResolver, ThemesService, ThemesGuard],
  exports: [ThemesService],
})
export class ThemesModule {}
