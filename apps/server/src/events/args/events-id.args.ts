import { ArgsType, Field } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";

@ArgsType()
export class EventsIdArgs {
  @IsNotEmpty()
  @Field()
  eventsId: string;
}
