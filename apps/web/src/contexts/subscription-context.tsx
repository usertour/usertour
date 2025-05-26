import { useQuery } from '@apollo/client';
import { getSubscriptionByProjectId, getSubscriptionUsage } from '@usertour-ui/gql';
import { PlanType, type Subscription } from '@usertour-ui/types';
import {
  HobbySessionLimit,
  ProSessionLimit,
  GrowthSessionLimit,
  BusinessSessionLimit,
} from '@usertour-ui/constants';
import { ReactNode, createContext, useContext } from 'react';

export interface SubscriptionProviderProps {
  children?: ReactNode;
  projectId: string | undefined;
}

export interface SubscriptionContextValue {
  subscription: Subscription | null;
  currentUsage: number;
  totalLimit: number;
  planType: PlanType;
  loading: boolean;
  refetch: () => void;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider(props: SubscriptionProviderProps): JSX.Element {
  const { children, projectId } = props;

  const {
    data: subscriptionData,
    refetch: refetchSubscription,
    loading: subscriptionLoading,
  } = useQuery(getSubscriptionByProjectId, {
    variables: { projectId },
  });

  const { data: usageData, loading: usageLoading } = useQuery(getSubscriptionUsage, {
    variables: { projectId },
  });

  const subscription = subscriptionData?.getSubscriptionByProjectId;
  const currentUsage = usageData?.getSubscriptionUsage ?? 0;
  const planType: PlanType = subscription?.planType ?? PlanType.HOBBY;

  const planLimits: Record<PlanType, number> = {
    [PlanType.HOBBY]: HobbySessionLimit,
    [PlanType.STARTER]: ProSessionLimit,
    [PlanType.GROWTH]: GrowthSessionLimit,
    [PlanType.BUSINESS]: BusinessSessionLimit,
  };

  const totalLimit = planLimits[planType] ?? HobbySessionLimit;

  const value: SubscriptionContextValue = {
    subscription,
    currentUsage,
    totalLimit,
    planType,
    loading: subscriptionLoading || usageLoading,
    refetch: refetchSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider.');
  }
  return context;
}
