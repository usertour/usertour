import { Module } from "@nestjs/common";
import { UtilitiesResolver } from "./utilities.resolver";
import { UtilitiesService } from "./utilities.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule],
  providers: [UtilitiesResolver, UtilitiesService],
})
export class UtilitiesModule {}
