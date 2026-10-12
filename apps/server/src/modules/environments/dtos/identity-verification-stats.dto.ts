import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import { SignatureSubject } from '@/modules/common/types/signature-subject.type';

registerEnumType(SignatureSubject, { name: 'SignatureSubject' });

/**
 * Aggregated signature verification counters for one subject (user/company)
 * over the console's coverage window. Anonymous counts are informational and
 * excluded from the coverage denominator — anonymous ids can never be signed.
 */
@ObjectType('IdentityVerificationStats')
export class IdentityVerificationStatsDTO {
  @Field(() => SignatureSubject)
  subject: SignatureSubject;

  @Field(() => Int)
  valid: number;

  @Field(() => Int)
  invalid: number;

  @Field(() => Int)
  missing: number;

  @Field(() => Int)
  anonymous: number;
}
