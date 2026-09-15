import { useMemo } from 'react';
import { Capability } from '@usertour/types';
import { useActiveProject } from './use-active-project';
import { useCapabilities } from './use-capabilities';

/**
 * Where the current member may PUBLISH on the active project. A role holding
 * ContentPublishAnyEnvironment (ADMIN / OWNER) publishes everywhere; an EDITOR
 * is limited to their publish whitelist (UserOnProject.allowedEnvironmentIds,
 * null = nowhere); a VIEWER cannot publish at all. The whitelist bounds
 * publishing only — reads and every other write are unrestricted by
 * membership, so nothing else in the UI filters environments by it. The
 * server guard is the real enforcement.
 */
export const useMemberPublishScope = () => {
  const project = useActiveProject();
  const { can } = useCapabilities();
  return useMemo(() => {
    const anywhere = can(Capability.ContentPublishAnyEnvironment);
    const whitelist = anywhere ? null : (project?.allowedEnvironmentIds ?? []);
    return {
      canPublishTo: (environmentId: string | undefined | null): boolean =>
        can(Capability.ContentPublish) &&
        (whitelist === null || (!!environmentId && whitelist.includes(environmentId))),
    };
  }, [project, can]);
};
