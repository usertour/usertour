import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
   * Persist the local copy (plus an optional config patch) to the
   * server. Enables the integration as a side-effect, mirroring the
   * provider-specific save handlers we replace.
   *
   * Pass `source` to override the integration values being committed —
   * used by the switch-off auto-save to persist only the toggle change
   * without dragging unsaved key edits along (the local copy includes
   * every keystroke from the controlled Input).
   */
  save: (configPatch?: Partial<TConfig>, source?: IntegrationModel) => Promise<void>;
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
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const currentIntegration = integrations?.find(
    (row: IntegrationModel) => row.provider === provider,
  );
  const [integration, setIntegration] = useState<IntegrationModel | undefined>(currentIntegration);

  // Re-seed the local copy only when the underlying integration identity
  // shifts (initial hydration, environment switch). Depending on the full
  // object reference would have effect fire on every Apollo cache emit —
  // including unrelated refetches on the same env — and wipe whatever the
  // user is mid-typing into key/region fields. Saving owns its own flush
  // via `refetch()` + whichever post-save tick the consumer wants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIntegration(currentIntegration);
  }, [currentIntegration?.id, environmentId]);

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
    async (configPatch?: Partial<TConfig>, source?: IntegrationModel) => {
      try {
        setIsLoading(true);
        const sourceIntegration = source ?? integration;
        await updateIntegration(environmentId, provider, {
          enabled: true,
          key: sourceIntegration?.key,
          config: {
            ...(sourceIntegration?.config ?? {}),
            ...(configPatch ?? {}),
          },
        });
        toast({ title: t('settings.integrations.providerCard.savedToast') });
        // Reseed local state from the server's response — the effect
        // above only re-syncs when `currentIntegration?.id` changes, so
        // a save that triggers server-side normalisation (trim,
        // lowercase, etc.) would leave the local copy diverged from
        // truth and the form dirty forever. Reading the freshly-fetched
        // row directly off the `result.data` keeps us decoupled from
        // the render cycle.
        const result = await refetch();
        const fresh = (result.data?.listIntegrations as IntegrationModel[] | undefined)?.find(
          (row) => row.provider === provider,
        );
        if (fresh) {
          setIntegration(fresh);
        }
      } catch {
        toast({
          title: t('settings.integrations.providerCard.saveFailedToast'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [environmentId, integration, provider, updateIntegration, toast, refetch, t],
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
