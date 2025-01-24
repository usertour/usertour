import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class OEmbed {
  @Field(() => String)
  html: string;

  @Field(() => String)
  width: string;

  @Field(() => String)
  height: string;
}
