import { ArgsType, Field } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";

@ArgsType()
export class ThemeIdArgs {
  @IsNotEmpty()
  @Field()
  themeId: string;
}
