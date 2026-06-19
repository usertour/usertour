import { Field, InputType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

@InputType()
export class CreateOidcSsoProviderInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  name: string;

  // Role assigned to JIT-provisioned users. Restricted to ADMIN (editor) or
  // VIEWER (read-only) — OWNER/USER are rejected. See plan & permission matrix.
  @Field(() => Role, { nullable: false })
  @IsIn([Role.ADMIN, Role.VIEWER])
  defaultRole: Role;

  // Optional unverified email-domain allow-list for JIT. Empty = trust the IdP.
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  allowedDomains?: string[];

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
