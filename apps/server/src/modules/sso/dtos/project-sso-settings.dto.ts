import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { SsoDefaultRole } from '../types/sso-default-role.type';

registerEnumType(SsoDefaultRole, { name: 'SsoDefaultRole' });

/**
 * Project-level SSO settings (owner-only): force-SSO enforcement plus the JIT
 * provisioning policy. Returned with defaults synthesized when no row exists,
 * so the client always gets a concrete shape.
 */
@ObjectType('ProjectSsoSettingsModel')
export class ProjectSsoSettingsDTO {
  @Field()
  projectId: string;

  @Field()
  requireSso: boolean;

  @Field()
  autoProvision: boolean;

  @Field(() => SsoDefaultRole)
  defaultRole: SsoDefaultRole;

  @Field(() => [String])
  allowedDomains: string[];
}
