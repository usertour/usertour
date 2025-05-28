import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GlobalConfig {
  @Field(() => Boolean)
  enabledBilling: boolean;

  @Field(() => Boolean)
  isSelfHostedMode: boolean;
}
