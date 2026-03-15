import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InstanceSetting {
  @Field()
  id: string;

  @Field()
  instanceId: string;

  @Field(() => String, { nullable: true })
  license: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class InstanceLicensePayload {
  @Field(() => String, { nullable: true })
  plan: string;

  @Field(() => String, { nullable: true })
  sub: string;

  @Field(() => String, { nullable: true })
  scope: string;

  @Field(() => String, { nullable: true })
  instanceId: string;

  @Field(() => String, { nullable: true })
  projectId: string;

  @Field(() => Int, { nullable: true })
  projectLimit: number | null;

  @Field(() => Int, { nullable: true })
  iat: number;

  @Field(() => Int, { nullable: true })
  exp: number;

  @Field(() => String, { nullable: true })
  issuer: string;

  @Field(() => [String], { nullable: true })
  features: string[];
}

@ObjectType()
export class InstanceLicenseInfo {
  @Field(() => String, { nullable: true })
  license: string | null;

  @Field(() => InstanceLicensePayload, { nullable: true })
  payload: InstanceLicensePayload | null;

  @Field()
  isValid: boolean;

  @Field(() => Boolean, { nullable: true })
  isExpired: boolean;

  @Field(() => String, { nullable: true })
  error: string | null;

  @Field(() => Int, { nullable: true })
  daysRemaining: number | null;
}

@ObjectType()
export class AdminUser {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field()
  createdAt: Date;

  @Field()
  isSystemAdmin: boolean;

  @Field(() => Int)
  projectCount: number;
}

@ObjectType()
export class AdminProject {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field(() => String, { nullable: true })
  ownerName: string | null;

  @Field(() => String, { nullable: true })
  ownerEmail: string | null;

  @Field(() => Int)
  memberCount: number;

  @Field()
  licenseSource: string;
}

@ObjectType()
export class AdminSettingsInfo {
  @Field()
  instanceId: string;

  @Field(() => InstanceLicenseInfo, { nullable: true })
  licenseInfo: InstanceLicenseInfo | null;

  @Field(() => Int)
  projectCount: number;
}
