import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Aggregated signature verification counters for one subject (user/company)
 * over the console's coverage window. Anonymous counts are informational and
 * excluded from the coverage denominator — anonymous ids can never be signed.
 */
@ObjectType('IdentityVerificationStats')
export class IdentityVerificationStatsDTO {
  @Field()
  subject: string;

  @Field(() => Int)
  valid: number;

  @Field(() => Int)
  invalid: number;

  @Field(() => Int)
  missing: number;

  @Field(() => Int)
  anonymous: number;
}
