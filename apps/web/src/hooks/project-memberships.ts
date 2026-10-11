import type { CurrentUser } from '@usertour/hooks';
import type { Capability, Project } from '@usertour/types';

/** One of the user's project memberships, as the `me` query delivers it. */
export type ProjectMembership = NonNullable<CurrentUser['projects']>[number];

/**
 * The user's projects as the server reported them, or `undefined` when the
 * server did not report them.
 *
 * `me.projects` is a nullable field resolved by its own query — the generated
 * type says so. When that query fails, GraphQL answers `projects: null` next
 * to a field error while the rest of `me` arrives intact, and the `me` query
 * opts into `errorPolicy: 'all'` to keep the user. A missing list is unknown,
 * never empty: reading it as `[]` sent users to the create-project screen
 * during a database outage, where the form would really have created one.
 */
export const projectsFromProfile = (
  userInfo: CurrentUser | null | undefined,
): Project[] | undefined => {
  const memberships = userInfo?.projects;
  if (!Array.isArray(memberships)) {
    return undefined;
  }
  return memberships.map((membership) => ({
    id: membership.project.id,
    name: membership.project.name,
    logoUrl: membership.project.logoUrl ?? undefined,
    subscriptionId: membership.project.subscriptionId ?? undefined,
    customerId: membership.project.customerId ?? undefined,
    role: membership.role,
    actived: membership.actived,
    allowedEnvironmentIds: membership.allowedEnvironmentIds ?? null,
    capabilities: membership.capabilities as Capability[],
  }));
};

/**
 * The active project: `undefined` while the list is unknown, `null` when the
 * list is known and nothing in it is `actived`, else the project.
 */
export const activeProjectOf = (projects: Project[] | undefined): Project | null | undefined => {
  if (projects === undefined) {
    return undefined;
  }
  return projects.find((project) => project.actived) ?? null;
};
