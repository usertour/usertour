import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class LicensePayloadModel {
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
export class GeneratedLicense {
  @Field(() => String)
  token: string;

  @Field(() => LicensePayloadModel)
  payload: LicensePayloadModel;

  @Field(() => String)
  expiresAt: string;
}

@ObjectType()
export class LicenseValidationResult {
  @Field(() => Boolean)
  isValid: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Boolean, { nullable: true })
  isExpired?: boolean;

  @Field(() => LicensePayloadModel, { nullable: true })
  payload?: LicensePayloadModel;

  @Field(() => Int, { nullable: true })
  daysRemaining?: number;
}

@ObjectType()
export class LicenseAdminStatus {
  @Field(() => Boolean)
  isConfigured: boolean;

  @Field(() => Boolean)
  canGenerateLicenses: boolean;

  @Field(() => String, { nullable: true })
  issuer?: string;

  @Field(() => String, { nullable: true })
  message?: string;
}
