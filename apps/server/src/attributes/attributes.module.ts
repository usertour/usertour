import { Module } from "@nestjs/common";
import { AttributesResolver } from "./attributes.resolver";
import { AttributesService } from "./attributes.service";
import { ProjectsModule } from "@/projects/projects.module";
import { AttributesGuard } from "./attributes.guard";

@Module({
  imports: [ProjectsModule],
  providers: [AttributesResolver, AttributesService, AttributesGuard],
})
export class AttributesModule {}
