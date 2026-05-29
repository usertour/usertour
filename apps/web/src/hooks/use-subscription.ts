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

// Composes subscription + project-config + usage into a single shape,
// mirroring the legacy `useSubscriptionContext` value. Reads the active
// project internally so callers don't have to plumb projectId /
// subscriptionId through.
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

  // `usage` is an externally-accumulating server-side counter (end-users
  // triggering flows add to it). Nothing on this page mutates it, so
  // cache-first would freeze the value for the whole SPA session.
  // cache-and-network keeps Apollo broadcast participation (so a manual
  // refetch propagates) while also firing network on every mount, which
  // is the ADR 0005 documented escape hatch for externally-mutated data.
  const {
    usage: currentUsage,
    loading: usageLoading,
    refetch: refetchUsage,
  } = useGetSubscriptionUsageQuery(projectId, { fetchPolicy: 'cache-and-network' });

  const planType: PlanType = subscription?.planType ?? PlanType.HOBBY;
  const features = useMemo(
    () => resolvePlanFeatures(planType, subscription?.overridePlan),
    [planType, subscription?.overridePlan],
  );
  const totalLimit = features.sessionsLimit;
  const shouldShowMadeWith = projectConfigLoading
    ? false
    : !(projectConfig?.removeBranding ?? false);
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
