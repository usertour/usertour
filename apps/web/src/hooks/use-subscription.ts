import { resolvePlanFeatures } from '@usertour/helpers';
import {
  useGetProjectConfigQuery,
  useGetSubscriptionByProjectIdQuery,
  useGetSubscriptionUsageQuery,
} from '@usertour/hooks';
import { type PlanFeatures, PlanType, type Subscription } from '@usertour/types';
import { useCallback, useMemo } from 'react';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useActiveProject } from './use-active-project';

// Composes subscription + project-config + usage into a single shape.
// Reads the active project internally so callers don't have to plumb
// projectId / subscriptionId through.
export interface SubscriptionState {
  subscription: Subscription | null;
  currentUsage: number;
  // Effective sessions cap. 'unlimited' is preserved (rather than
  // converted to Infinity) so callers handle the unbounded case
  // explicitly — otherwise quota displays render as "Infinity".
  totalLimit: number | 'unlimited';
  planType: PlanType;
  // Effective per-plan features (base + override). All quota / gate
  // consumers should read from here rather than re-resolving.
  features: PlanFeatures;
  loading: boolean;
  refetch: () => void;
  shouldShowMadeWith: boolean;
}

export const useSubscription = (): SubscriptionState => {
  const project = useActiveProject() as
    | (ReturnType<typeof useActiveProject> & { subscriptionId?: string })
    | null;
  const projectId = project?.id;
  const subscriptionId = project?.subscriptionId;

  // SHARED_CACHE_QUERY_OPTIONS: multiple pages compose this hook
  // (billing/pricing + theme previews + use-plan-limits). Cache
  // participation lets a refetch from one consumer propagate.
  const {
    subscription,
    loading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useGetSubscriptionByProjectIdQuery(projectId, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    skip: !projectId || !subscriptionId,
  });

  const {
    projectConfig,
    loading: projectConfigLoading,
    refetch: refetchProjectConfig,
  } = useGetProjectConfigQuery(projectId, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    skip: !projectId,
  });

  const {
    usage: currentUsage,
    loading: usageLoading,
    refetch: refetchUsage,
  } = useGetSubscriptionUsageQuery(projectId, SHARED_CACHE_QUERY_OPTIONS);

  const planType: PlanType = subscription?.planType ?? PlanType.HOBBY;
  const features = useMemo(
    () => resolvePlanFeatures(planType, subscription?.overridePlan),
    [planType, subscription?.overridePlan],
  );
  const totalLimit = features.sessionsLimit;
  // `loading && !data` gate (not bare loading): cache-and-network refetches
  // flip loading true while the cached config is still present — see
  // useShouldShowMadeWith for the full story.
  const shouldShowMadeWith =
    projectConfigLoading && !projectConfig ? false : !(projectConfig?.removeBranding ?? false);
  const loading = projectConfigLoading || subscriptionLoading || usageLoading;
  const refetch = useCallback(() => {
    refetchProjectConfig();
    refetchUsage();
    if (subscriptionId) {
      refetchSubscription();
    }
  }, [refetchProjectConfig, refetchUsage, refetchSubscription, subscriptionId]);

  return {
    subscription,
    currentUsage,
    totalLimit,
    planType,
    features,
    loading,
    refetch,
    shouldShowMadeWith,
  };
};
