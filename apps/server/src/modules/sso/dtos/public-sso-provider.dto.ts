import { Field, ID, ObjectType } from '@nestjs/graphql';
import { SsoProviderType } from '@prisma/client';

/**
 * Pre-auth view returned to the project's SSO login page. Carries only what
 * the page needs to render a button — never any config or secret. The
 * SsoProviderType enum is registered in sso-provider.dto.ts.
 */
@ObjectType('PublicSsoProviderModel')
export class PublicSsoProviderDTO {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => SsoProviderType)
  type: SsoProviderType;
}
