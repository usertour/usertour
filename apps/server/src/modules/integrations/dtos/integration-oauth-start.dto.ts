import { Field, ObjectType } from '@nestjs/graphql';

/** Result of starting a CRM OAuth handshake: where to send the browser. */
@ObjectType('IntegrationOAuthStart')
export class IntegrationOAuthStartDTO {
  @Field(() => String)
  url: string;
}
