import { useMemo } from 'react';
import type { Project } from '@usertour/types';
import { activeProjectOf, projectsFromProfile } from './project-memberships';
import { useCurrentUser } from './use-current-user';

// Derives the user's project memberships + the currently-active one from
// `useCurrentUser()`. Active selection is server-side (the `actived`
// flag) — there's no client choice here.
//
// Both are three-state. `undefined` means the server has not reported the
// list (still loading, or the `projects` field failed); callers must not
// read it as "no projects" — see projectsFromProfile.
export const useUserProjects = (): Project[] | undefined => {
  const { userInfo } = useCurrentUser();
  return useMemo(() => projectsFromProfile(userInfo), [userInfo]);
};

export const useActiveProject = (): Project | null | undefined => {
  const projects = useUserProjects();
  return useMemo(() => activeProjectOf(projects), [projects]);
};
