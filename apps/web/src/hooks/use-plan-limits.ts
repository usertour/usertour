import { isWithinLimit } from '@usertour/helpers';
import type { PlanFeatures } from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useMemberContext } from '@/contexts/member-context';
import { useSubscriptionContext } from '@/contexts/subscription-context';

// Per-quota hooks that compose subscription features, the relevant
// resource list, and the self-hosted-mode bypass into a single
// {limit, current, canUseMore} shape. Consumers shouldn't be calling
// resolvePlanFeatures or branching on 'unlimited' / isSelfHostedMode
// themselves — those concerns belong here.

interface QuotaResult<K extends keyof PlanFeatures> {
  limit: PlanFeatures[K];
  current: number;
  canUseMore: boolean;
}

function useQuota<K extends keyof PlanFeatures>(key: K, current: number): QuotaResult<K> {
  const { features } = useSubscriptionContext();
  const { globalConfig } = useAppContext();
  const limit = features[key];
  // Self-hosted mode has no client-side cap — license handles that path.
  const canUseMore =
    !!globalConfig?.isSelfHostedMode || isWithinLimit(limit as number | 'unlimited', current);
  return { limit, current, canUseMore };
}

export function useEnvironmentLimit() {
  const { environmentList } = useEnvironmentListContext();
  return useQuota('environmentLimit', environmentList?.length ?? 0);
}

export function useTeamMemberLimit() {
  const { members = [] } = useMemberContext();
  return useQuota('teamMemberLimit', members.length);
}

export function useSessionsLimit(currentUsage: number) {
  return useQuota('sessionsLimit', currentUsage);
}
