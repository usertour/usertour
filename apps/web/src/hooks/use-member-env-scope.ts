import { useMemo } from 'react';
import { useActiveProject } from './use-active-project';

/**
 * The current user's environment restriction on the active project
 * (UserOnProject.allowedEnvironmentIds — the third permission dimension).
 * `allowed === null` means unrestricted (legacy members and OWNER, whom the
 * server exempts). UI uses this to hide/disable out-of-scope environments;
 * the server guard is the real enforcement.
 */
export const useMemberEnvScope = () => {
  const project = useActiveProject();
  return useMemo(() => {
    const allowed = project?.role === 'OWNER' ? null : (project?.allowedEnvironmentIds ?? null);
    return {
      allowed,
      canActOn: (environmentId: string | undefined | null): boolean =>
        allowed === null || (!!environmentId && allowed.includes(environmentId)),
    };
  }, [project]);
};
