import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * A per-environment HMAC signing secret for SDK identity verification
 * (ADR 0008). The secret field is masked in list responses; the full value is
 * returned only by createSigningSecret and getSigningSecret.
 */
@ObjectType()
export class EnvironmentSigningSecret {
  @Field(() => ID)
  id: string;

  @Field()
  secret: string;

  @Field()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;
}

/**
 * Result of the console's "Validate token" tool (ADR 0009): why a pasted
 * identity token does or doesn't verify against the environment's active
 * signing secrets.
 */
@ObjectType()
export class IdentityTokenDiagnosisModel {
  @Field()
  status: string;

  @Field({ nullable: true })
  subject?: string;

  @Field({ nullable: true })
  companyId?: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}

/**
 * Aggregated signature verification counters for one subject (user/company)
 * over the console's coverage window. Anonymous counts are informational and
 * excluded from the coverage denominator — anonymous ids can never be signed.
 */
@ObjectType()
export class IdentityVerificationStats {
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
