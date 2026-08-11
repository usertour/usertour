import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useMemberEnvScope } from '@/hooks/use-member-env-scope';
import { storage } from '@usertour/helpers';
import { StorageKeys } from '@usertour/constants';
import { Environment } from '@usertour/types';
import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Custom hook to handle environment selection with priority logic, confined to
 * the environments the current member is allowed to act on (see useMemberEnvScope):
 * 1. URL params (envId)
 * 2. localStorage (user's last choice)
 * 3. Primary environment (isPrimary === true)
 * 4. First environment (fallback)
 *
 * @returns selectEnvironment - Function to manually select an environment (updates both context and localStorage)
 * @returns isNonPrimary - Whether current environment is non-primary (only true if there's a primary env in list and current is not primary)
 */
export const useEnvironmentSelection = () => {
  const { envId } = useParams();
  const { setEnvironment, userInfo, environment } = useAppContext();
  const { environmentList } = useEnvironmentList();
  const { canActOn } = useMemberEnvScope();

  // Auto-selection considers only the environments this member can act on. A
  // member restricted to a subset (UserOnProject.allowedEnvironmentIds) must not
  // be landed on an out-of-scope environment — the server walls every action
  // there. Unrestricted members (OWNER / legacy) have canActOn === true for all,
  // so this is identical to the full list for them.
  const selectableEnvironments = useMemo(
    () => environmentList?.filter((env) => canActOn(env.id)),
    [environmentList, canActOn],
  );

  // Memoize storage key to avoid recalculation
  const storageKey = useMemo(
    () => (userInfo?.id ? `${StorageKeys.ENVIRONMENT_ID}-${userInfo.id}` : null),
    [userInfo?.id],
  );

  // Unified function to select environment and update storage
  const selectEnvironment = useCallback(
    (env: Environment) => {
      setEnvironment(env);
      if (storageKey && env.id) {
        storage.setLocalStorage(storageKey, env.id);
      }
    },
    [setEnvironment, storageKey],
  );

  useEffect(() => {
    // Early return if prerequisites are not met (nothing the member can act on
    // included — a member with an empty allowed set selects nothing rather than
    // landing on a walled environment).
    if (
      !selectableEnvironments ||
      selectableEnvironments.length === 0 ||
      !userInfo?.id ||
      !storageKey
    ) {
      return;
    }

    // Priority 1: Use envId from URL params if provided
    if (envId) {
      const matchedEnv = selectableEnvironments.find((env) => env.id === envId);
      if (matchedEnv) {
        selectEnvironment(matchedEnv);
        return;
      }
    }

    // Priority 2: Use environmentId from localStorage
    const storedEnvId = storage.getLocalStorage(storageKey) as string | undefined;
    if (storedEnvId) {
      const matchedEnv = selectableEnvironments.find((env) => env.id === storedEnvId);
      if (matchedEnv) {
        selectEnvironment(matchedEnv);
        return;
      }
    }

    // Priority 3: Use environment with isPrimary === true
    const primaryEnv = selectableEnvironments.find((env) => env.isPrimary === true);
    if (primaryEnv) {
      selectEnvironment(primaryEnv);
      return;
    }

    // Priority 4: Fallback to first environment
    const currentEnv = selectableEnvironments[0];
    if (currentEnv) {
      selectEnvironment(currentEnv);
    }
  }, [envId, selectableEnvironments, selectEnvironment, storageKey, userInfo?.id]);

  // Check if there's a primary environment the member can act on, and the current
  // environment is not primary. Scoped to selectable envs so a restricted member
  // without access to the primary env isn't nudged to switch to one they can't use.
  const hasPrimaryEnv = useMemo(
    () => selectableEnvironments?.some((env) => env.isPrimary === true) ?? false,
    [selectableEnvironments],
  );
  const isNonPrimary = useMemo(
    () => environment && hasPrimaryEnv && environment.isPrimary !== true,
    [environment, hasPrimaryEnv],
  );

  return { selectEnvironment, isNonPrimary };
};
