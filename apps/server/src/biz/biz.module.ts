import { Module } from "@nestjs/common";
import { BizResolver } from "./biz.resolver";
import { BizService } from "./biz.service";
import { EnvironmentsModule } from "@/environments/environments.module";
import { BizGuard } from "./biz.guard";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  imports: [EnvironmentsModule, ProjectsModule],
  providers: [BizResolver, BizService, BizGuard],
})
export class BizModule {}
