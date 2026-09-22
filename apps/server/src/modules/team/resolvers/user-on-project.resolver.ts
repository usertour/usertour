import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ROLE_CAPABILITIES } from '@usertour/constants';
import { Role } from '@usertour/types';

import { UserOnProjectDTO } from '../dtos/user-on-project.dto';

/**
 * Serializes the capabilities a membership's role grants to the client, so
 * the frontend can gate UI on `useCan(capability)` instead of re-deriving
 * from the role. Pure projection of ROLE_CAPABILITIES — no DB access.
 */
@Resolver(() => UserOnProjectDTO)
export class UserOnProjectResolver {
  @ResolveField(() => [String])
  capabilities(@Parent() membership: UserOnProjectDTO): string[] {
    return ROLE_CAPABILITIES[membership.role as unknown as Role] ?? [];
  }
}
