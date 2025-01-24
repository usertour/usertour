import {
  InputType,
  Field,
  PartialType,
  OmitType,
  PickType,
  ArgsType,
} from "@nestjs/graphql";
import { Events } from "../models/events.model";

@InputType()
export class CreateEventInput extends OmitType(
  Events,
  ["id", "createdAt", "updatedAt", "predefined"],
  InputType
) {}

@InputType()
export class UpdateEventInput extends PartialType(
  OmitType(Events, ["projectId", "createdAt", "updatedAt", , "predefined"]),
  InputType
) {
  @Field(() => String)
  id: string;
}

@InputType()
export class DeleteEventInput extends PickType(Events, ["id"], InputType) {}

@ArgsType()
export class QueryEventsInput extends PickType(
  Events,
  ["projectId"],
  ArgsType
) {}

@InputType()
export class InitEventInput extends PickType(
  Events,
  ["displayName", "codeName"],
  InputType
) {}
