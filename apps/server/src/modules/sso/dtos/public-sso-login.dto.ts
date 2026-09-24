import { Field, ObjectType } from '@nestjs/graphql';

import { PublicSsoProviderDTO } from './public-sso-provider.dto';

/**
 * Pre-auth view for the per-project SSO entry page: the project's branding
 * (name + logo, shown for context) and its active providers. Carries no
 * config or secrets.
 */
@ObjectType('PublicSsoLoginModel')
export class PublicSsoLoginDTO {
  @Field()
  name: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field(() => [PublicSsoProviderDTO])
  providers: PublicSsoProviderDTO[];
}
