import { Module } from "@nestjs/common";
import { LocalizationsResolver } from "./localizations.resolver";
import { LocalizationsService } from "./localizations.service";
import { ProjectsModule } from "@/projects/projects.module";
import { LocalizationsGuard } from "./localizations.guard";

@Module({
  imports: [ProjectsModule],
  providers: [LocalizationsResolver, LocalizationsService, LocalizationsGuard],
  exports: [LocalizationsService],
})
export class LocalizationsModule {}
