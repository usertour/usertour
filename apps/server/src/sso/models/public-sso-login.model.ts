import { Field, ObjectType } from '@nestjs/graphql';

import { PublicSsoProviderModel } from './public-sso-provider.model';

/**
 * Pre-auth view for the per-project SSO entry page: the project's branding
 * (name + logo, shown for context) and its active providers. Carries no
 * config or secrets.
 */
@ObjectType()
export class PublicSsoLoginModel {
  @Field()
  name: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field(() => [PublicSsoProviderModel])
  providers: PublicSsoProviderModel[];
}
