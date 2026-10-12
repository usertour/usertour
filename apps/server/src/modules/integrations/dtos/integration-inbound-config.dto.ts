import { Field, ObjectType } from '@nestjs/graphql';

/** Inbound cohort sync settings (ADR 0012), stored in `Integration.inboundConfig`. */
@ObjectType('IntegrationInboundConfig')
export class IntegrationInboundConfigDTO {
  /** Member property holding the Usertour user id; absent = the provider's distinct id. */
  @Field(() => String, { nullable: true })
  userIdProperty?: string | null;
}
