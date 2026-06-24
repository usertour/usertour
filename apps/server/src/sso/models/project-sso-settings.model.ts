import { Field, ObjectType } from '@nestjs/graphql';
import { Role } from '@prisma/client';

/**
 * Project-level SSO settings (owner-only): force-SSO enforcement plus the JIT
 * provisioning policy. Returned with defaults synthesized when no row exists,
 * so the client always gets a concrete shape.
 */
@ObjectType()
export class ProjectSsoSettingsModel {
  @Field()
  projectId: string;

  @Field()
  requireSso: boolean;

  @Field()
  autoProvision: boolean;

  @Field(() => Role)
  defaultRole: Role;

  @Field(() => [String])
  allowedDomains: string[];
}
