import { useCallback, useEffect, useState } from 'react';
import { useListIntegrationsQuery, useUpdateIntegrationMutation } from '@usertour/hooks';
import type { IntegrationModel } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import { useAppContext } from '@/contexts/app-context';

interface UseIntegrationConfigResult<TConfig> {
  /** Local editable copy — reflects unsaved field edits. */
  integration: IntegrationModel | undefined;
  /** Server-truth copy — used to detect dirty state against the local copy. */
  currentIntegration: IntegrationModel | undefined;
  /** Apply a partial change to the local copy without persisting. */
  setLocal: (updates: Partial<IntegrationModel>) => void;
  /**
   * Persist the current local copy (plus an optional config patch) to the
   * server. Enables the integration as a side-effect, mirroring the
   * provider-specific save handlers we replace.
   */
  save: (configPatch?: Partial<TConfig>) => Promise<void>;
  isLoading: boolean;
  isDataLoading: boolean;
}

/**
 * Encapsulates the "fetch integration list → pull this provider's row →
 * keep a local editable copy → save back with toast" cycle that every
 * provider page (mixpanel / heap / hubspot / amplitude / posthog /
 * segment) hand-rolled identically.
 */
export function useIntegrationConfig<TConfig>(
  provider: string,
): UseIntegrationConfigResult<TConfig> {
  const { environment } = useAppContext();
  const environmentId = environment?.id ?? '';
  const {
    data: integrations,
    refetch,
    loading: isDataLoading,
  } = useListIntegrationsQuery(environmentId);
  const { invoke: updateIntegration } = useUpdateIntegrationMutation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const currentIntegration = integrations?.find(
    (row: IntegrationModel) => row.provider === provider,
  );
  const [integration, setIntegration] = useState<IntegrationModel | undefined>(currentIntegration);

  // Re-seed the local copy whenever the server response changes (initial
  // load + post-save refetch). Any user-in-flight edits are intentionally
  // dropped here because save already merged them.
  useEffect(() => {
    setIntegration(currentIntegration);
  }, [currentIntegration]);

  const setLocal = useCallback((updates: Partial<IntegrationModel>) => {
    setIntegration((previous) =>
      previous
        ? {
            ...previous,
            ...updates,
          }
        : previous,
    );
  }, []);

  const save = useCallback(
    async (configPatch?: Partial<TConfig>) => {
      try {
        setIsLoading(true);
        await updateIntegration(environmentId, provider, {
          enabled: true,
          key: integration?.key,
          config: {
            ...(integration?.config ?? {}),
            ...(configPatch ?? {}),
          },
        });
        toast({ title: 'Settings saved successfully' });
        await refetch();
      } catch {
        toast({ title: 'Failed to save settings', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    },
    [environmentId, integration, provider, updateIntegration, toast, refetch],
  );

  return {
    integration,
    currentIntegration,
    setLocal,
    save,
    isLoading,
    isDataLoading,
  };
}
