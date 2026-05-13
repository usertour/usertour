import { PlanType, type PlanFeatures, type Subscription } from '@usertour/types';
import { resolvePlanFeatures } from '@usertour/helpers';
import {
  useGetSubscriptionByProjectIdQuery,
  useGetProjectConfigQuery,
  useGetSubscriptionUsageQuery,
} from '@usertour-packages/hooks';
import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

export interface SubscriptionProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
  subscriptionId: string | undefined;
}

export interface SubscriptionContextValue {
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

export const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider(props: SubscriptionProviderProps): JSX.Element {
  const { children, projectId, subscriptionId } = props;

  // Use encapsulated hooks with custom skip logic
  // Skip query if projectId is missing OR subscriptionId is missing
  // This ensures we don't query when we know there's no subscription
  const {
    subscription,
    loading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useGetSubscriptionByProjectIdQuery(projectId, {
    skip: !projectId || !subscriptionId, // Skip if either is missing
  });

  const {
    projectConfig,
    loading: projectConfigLoading,
    refetch: refetchProjectConfig,
  } = useGetProjectConfigQuery(projectId, {
    skip: !projectId,
  });

  const { usage: currentUsage, loading: usageLoading } = useGetSubscriptionUsageQuery(projectId);

  // Calculate derived values
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
    if (subscriptionId) {
      refetchSubscription();
    }
  }, [refetchProjectConfig, refetchSubscription, subscriptionId]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      currentUsage,
      totalLimit,
      planType,
      features,
      loading,
      refetch,
      shouldShowMadeWith,
    }),
    [
      subscription,
      currentUsage,
      totalLimit,
      planType,
      features,
      loading,
      refetch,
      shouldShowMadeWith,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider.');
  }
  return context;
}
