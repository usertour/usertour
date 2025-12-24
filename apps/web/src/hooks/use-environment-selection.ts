import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { storage } from '@usertour/helpers';
import { StorageKeys } from '@usertour-packages/constants';
import { Environment } from '@usertour/types';
import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Custom hook to handle environment selection with priority logic:
 * 1. URL params (envId)
 * 2. localStorage (user's last choice)
 * 3. Primary environment (isPrimary === true)
 * 4. First environment (fallback)
 *
 * @returns selectEnvironment - Function to manually select an environment (updates both context and localStorage)
 */
export const useEnvironmentSelection = () => {
  const { envId } = useParams();
  const { setEnvironment, userInfo } = useAppContext();
  const { environmentList } = useEnvironmentListContext();

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
    // Early return if prerequisites are not met
    if (!environmentList || environmentList.length === 0 || !userInfo?.id || !storageKey) {
      return;
    }

    // Priority 1: Use envId from URL params if provided
    if (envId) {
      const matchedEnv = environmentList.find((env) => env.id === envId);
      if (matchedEnv) {
        selectEnvironment(matchedEnv);
        return;
      }
    }

    // Priority 2: Use environmentId from localStorage
    const storedEnvId = storage.getLocalStorage(storageKey) as string | undefined;
    if (storedEnvId) {
      const matchedEnv = environmentList.find((env) => env.id === storedEnvId);
      if (matchedEnv) {
        selectEnvironment(matchedEnv);
        return;
      }
    }

    // Priority 3: Use environment with isPrimary === true
    const primaryEnv = environmentList.find((env) => env.isPrimary === true);
    if (primaryEnv) {
      selectEnvironment(primaryEnv);
      return;
    }

    // Priority 4: Fallback to first environment
    const currentEnv = environmentList[0];
    if (currentEnv) {
      selectEnvironment(currentEnv);
    }
  }, [envId, environmentList, selectEnvironment, storageKey, userInfo?.id]);

  return { selectEnvironment };
};
