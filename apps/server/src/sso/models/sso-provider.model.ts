import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SsoProviderType } from '@prisma/client';

import { BaseModel } from '@/common/models/base.model';

registerEnumType(SsoProviderType, {
  name: 'SsoProviderType',
  description: 'SSO identity provider protocol',
});

/**
 * Authenticated view of a project's SSO identity provider (owner-only).
 * `clientSecret` is intentionally omitted — it is write-only and never
 * returned over the API. Provisioning policy lives on ProjectSsoSettingsModel.
 */
@ObjectType()
export class SsoProviderModel extends BaseModel {
  @Field()
  projectId: string;

  @Field(() => SsoProviderType)
  type: SsoProviderType;

  @Field()
  name: string;

  @Field()
  status: string;

  @Field()
  issuer: string;

  @Field()
  clientId: string;

  @Field({ nullable: true })
  authorizationUrl?: string;

  @Field({ nullable: true })
  tokenUrl?: string;

  @Field({ nullable: true })
  userInfoUrl?: string;
}
