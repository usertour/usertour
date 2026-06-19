import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

// All fields optional — only the provided ones are written. clientSecret is
// write-only: send it only to rotate the secret, omit it to keep the current.
@InputType()
export class UpdateSsoProviderInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  // active | inactive — toggling to inactive hides the provider from login.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  issuer?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsNotEmpty()
  clientId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsNotEmpty()
  clientSecret?: string;

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
