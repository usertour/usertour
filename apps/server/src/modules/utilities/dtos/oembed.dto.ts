import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('OEmbed')
export class OEmbedDTO {
  @Field(() => String)
  html: string;

  // The provider's pixel sizes, coerced to numbers by the service (some
  // providers send them as strings); 0 when the provider sent none.
  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;
}
