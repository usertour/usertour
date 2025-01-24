import { Module } from "@nestjs/common";
import { EnvironmentsResolver } from "./environments.resolver";
import { EnvironmentsService } from "./environments.service";
import { EnvironmentsGuard } from "./environments.guard";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  imports: [ProjectsModule],
  providers: [EnvironmentsResolver, EnvironmentsService, EnvironmentsGuard],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
