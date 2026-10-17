import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { IdentityTokenStatus } from '@/modules/common/types/identity-token-status.type';

registerEnumType(IdentityTokenStatus, { name: 'IdentityTokenStatus' });

/**
 * Result of the console's "Validate token" tool (ADR 0009): why a pasted
 * identity token does or doesn't verify against the environment's active
 * signing secrets.
 */
@ObjectType('IdentityTokenDiagnosisModel')
export class IdentityTokenDiagnosisDTO {
  @Field(() => IdentityTokenStatus)
  status: IdentityTokenStatus;

  @Field({ nullable: true })
  subject?: string;

  @Field({ nullable: true })
  companyId?: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}
