import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

@InputType()
export class CreateOidcSsoProviderInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  name: string;

  @Field(() => String, { nullable: false })
  // require_tld: false so self-hosted IdPs on localhost / an internal host / a
  // bare IP (no public TLD) are accepted. The server only needs the issuer to
  // be reachable, not publicly resolvable; this also matches the frontend's
  // zod url() validation. Applies to the endpoint overrides below too.
  @IsUrl({ require_tld: false })
  issuer: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  clientId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  clientSecret: string;

  // Optional explicit endpoint overrides; discovered from the issuer when absent.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  authorizationUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  tokenUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  userInfoUrl?: string;
}
