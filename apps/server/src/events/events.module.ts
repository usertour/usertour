import { Module } from "@nestjs/common";
import { EventsResolver } from "./events.resolver";
import { EventsService } from "./events.service";
import { EventsGuard } from "./events.guard";
import { ProjectsModule } from "@/projects/projects.module";

@Module({
  imports: [ProjectsModule],
  providers: [EventsResolver, EventsService, EventsGuard],
})
export class EventsModule {}
