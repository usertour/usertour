import { useMemo } from 'react';
import type { Capability, Project } from '@usertour/types';
import { useCurrentUser } from './use-current-user';

// The `me` query response carries an extra `projects` array of role
// memberships that `UserProfile` (in @usertour/types) doesn't declare;
// match the legacy AppContext's pragmatic loose access here.
interface ProjectMembership {
  role: string;
  actived: boolean;
  capabilities?: Capability[];
  allowedEnvironmentIds?: string[] | null;
  project: Record<string, unknown>;
}

// Derives the user's project memberships + the currently-active one from
// `useCurrentUser()`. Active selection is server-side (the `actived`
// flag) — there's no client choice here.
export const useUserProjects = (): Project[] => {
  const { userInfo } = useCurrentUser();
  return useMemo(() => {
    const memberships = (userInfo as { projects?: ProjectMembership[] } | null | undefined)
      ?.projects;
    return (
      (memberships?.map((p) => ({
        role: p.role,
        actived: p.actived,
        capabilities: p.capabilities ?? [],
        allowedEnvironmentIds: p.allowedEnvironmentIds ?? null,
        ...p.project,
      })) as Project[]) ?? []
    );
  }, [userInfo]);
};

export const useActiveProject = (): Project | null => {
  const projects = useUserProjects();
  return useMemo(() => projects.find((p) => p.actived) ?? null, [projects]);
};
