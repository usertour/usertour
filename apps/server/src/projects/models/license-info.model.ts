import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class LicensePayload {
  @Field(() => String)
  plan: string;

  @Field(() => String)
  sub: string;

  @Field(() => String)
  projectId: string;

  @Field(() => Int)
  iat: number;

  @Field(() => Int)
  exp: number;

  @Field(() => String)
  issuer: string;

  @Field(() => [String])
  features: string[];
}

@ObjectType()
export class LicenseInfo {
  @Field(() => String, { nullable: true })
  license?: string;

  @Field(() => LicensePayload, { nullable: true })
  payload?: LicensePayload;

  @Field(() => Boolean, { nullable: true })
  isValid?: boolean;

  @Field(() => Boolean, { nullable: true })
  isExpired?: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Int, { nullable: true })
  daysRemaining?: number;
}
