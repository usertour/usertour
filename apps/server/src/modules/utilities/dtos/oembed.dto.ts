import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OEmbed')
export class OEmbedDTO {
  @Field(() => String)
  html: string;

  @Field(() => String)
  width: string;

  @Field(() => String)
  height: string;
}
