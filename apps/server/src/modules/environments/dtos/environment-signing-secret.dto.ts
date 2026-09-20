import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * A per-environment HMAC signing secret for SDK identity verification
 * (ADR 0008). The secret field is masked in list responses; the full value is
 * returned only by createSigningSecret and getSigningSecret.
 */
@ObjectType('EnvironmentSigningSecret')
export class EnvironmentSigningSecretDTO {
  @Field(() => ID)
  id: string;

  @Field()
  secret: string;

  @Field()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;
}
