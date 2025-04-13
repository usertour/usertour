import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpsertBizIntegrationInput {
  @Field()
  integrationId: string;

  @Field()
  enabled: boolean;

  //   @Field(() => String, { nullable: true })
  //   config?: Record<string, any>;
}
