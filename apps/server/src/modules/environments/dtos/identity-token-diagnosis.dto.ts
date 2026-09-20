import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Result of the console's "Validate token" tool (ADR 0009): why a pasted
 * identity token does or doesn't verify against the environment's active
 * signing secrets.
 */
@ObjectType('IdentityTokenDiagnosisModel')
export class IdentityTokenDiagnosisDTO {
  @Field()
  status: string;

  @Field({ nullable: true })
  subject?: string;

  @Field({ nullable: true })
  companyId?: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}
