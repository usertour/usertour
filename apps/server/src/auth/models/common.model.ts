import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Common {
  @Field()
  success: boolean;

  @Field()
  count?: number;
}
