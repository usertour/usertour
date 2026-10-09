import type { Capability, Project, UserProfile } from '@usertour/types';

// The `me` query response carries an extra `projects` array of role
// memberships that `UserProfile` (in @usertour/types) doesn't declare;
// match the legacy AppContext's pragmatic loose access here.
export interface ProjectMembership {
  role: string;
  actived: boolean;
  capabilities?: Capability[];
  allowedEnvironmentIds?: string[] | null;
  project: Record<string, unknown>;
}

type ProfileWithMemberships = { projects?: ProjectMembership[] | null } | null | undefined;

/**
 * The user's projects as the server reported them, or `undefined` when the
 * server did not report them.
 *
 * `me.projects` is a nullable field resolved by its own database query. When
 * that query fails, GraphQL answers `projects: null` next to a field error
 * while the rest of `me` arrives intact, and the app-wide `errorPolicy: 'all'`
 * hands that partial result to the UI. A missing list is unknown, never
 * empty: reading it as `[]` sent users to the create-project screen during a
 * database outage, where the form would really have created a project.
 */
export const projectsFromProfile = (
  userInfo: UserProfile | null | undefined,
): Project[] | undefined => {
  const memberships = (userInfo as ProfileWithMemberships)?.projects;
  if (!Array.isArray(memberships)) {
    return undefined;
  }
  return memberships.map((membership) => ({
    role: membership.role,
    actived: membership.actived,
    capabilities: membership.capabilities ?? [],
    allowedEnvironmentIds: membership.allowedEnvironmentIds ?? null,
    ...membership.project,
  })) as Project[];
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
