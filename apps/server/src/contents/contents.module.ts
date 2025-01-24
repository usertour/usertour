import { Module } from "@nestjs/common";
import { ContentsResolver } from "./contents.resolver";
import { ContentsService } from "./contents.service";
import { ContentsGuard } from "./contents.guard";
import { ProjectsModule } from "@/projects/projects.module";
import { EnvironmentsModule } from "@/environments/environments.module";
import { LocalizationsModule } from "@/localizations/localizations.module";

@Module({
  imports: [ProjectsModule, EnvironmentsModule, LocalizationsModule],
  providers: [ContentsResolver, ContentsService, ContentsGuard],
  exports: [ContentsService],
})
export class ContentsModule {}
