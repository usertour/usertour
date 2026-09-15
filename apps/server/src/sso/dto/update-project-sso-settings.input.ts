import { Field, InputType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';

/**
 * Project-level SSO settings patch. All fields optional — only the provided
 * ones are written. `requireSso` flips force-SSO enforcement; `defaultRole` /
 * `allowedDomains` are the JIT provisioning policy (previously per-provider).
 */
@InputType()
export class UpdateProjectSsoSettingsInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  requireSso?: boolean;

  // When true, a brand-new SSO email is auto-created and joined; when false
  // (default) SSO needs an existing membership or an invite to grant access.
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  // Role assigned to JIT-provisioned users. Restricted to EDITOR or VIEWER —
  // ADMIN (team management) is never granted automatically, OWNER is
  // transfer-only. See ADR 0014.
  @Field(() => Role, { nullable: true })
  @IsOptional()
  @IsIn([Role.EDITOR, Role.VIEWER])
  defaultRole?: Role;

  // Optional unverified email-domain allow-list for JIT. Empty = trust the IdP.
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  allowedDomains?: string[];
}
