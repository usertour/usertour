import { Module } from "@nestjs/common";
import { AnalyticsResolver } from "./analytics.resolver";
import { AnalyticsService } from "./analytics.service";
import { ContentsModule } from "@/contents/contents.module";
import { ProjectsModule } from "@/projects/projects.module";
import { EnvironmentsModule } from "@/environments/environments.module";

@Module({
  imports: [ContentsModule, ProjectsModule, EnvironmentsModule],
  providers: [AnalyticsResolver, AnalyticsService],
})
export class AnalyticsModule {}
