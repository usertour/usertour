import { ArgsType, Field } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";

@ArgsType()
export class LocalizationIdArgs {
  @IsNotEmpty()
  @Field(() => String)
  localizationId: string;
}
