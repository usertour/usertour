import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

@InputType()
export class CreateOidcSsoProviderInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  name: string;

  @Field(() => String, { nullable: false })
  @IsUrl()
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
  @IsUrl()
  authorizationUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  tokenUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  userInfoUrl?: string;
}
