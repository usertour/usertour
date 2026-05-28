import { isWithinLimit } from '@usertour/helpers';
import type { PlanFeatures } from '@usertour/types';
import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import { useGlobalConfig } from '@/hooks/use-global-config';
import { useActiveProject } from '@/hooks/use-active-project';
import { useMemberList } from '@/hooks/use-member-list';
import { useSubscription } from '@/hooks/use-subscription';

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
  const { features } = useSubscription();
  const { globalConfig } = useGlobalConfig();
  const limit = features[key];
  // Self-hosted mode has no client-side cap — license handles that path.
  const canUseMore =
    !!globalConfig?.isSelfHostedMode || isWithinLimit(limit as number | 'unlimited', current);
  return { limit, current, canUseMore };
}

export function useEnvironmentLimit() {
  const project = useActiveProject();
  const { environmentList } = useGetUserEnvironmentsQuery(project?.id);
  return useQuota('environmentLimit', environmentList?.length ?? 0);
}

export function useTeamMemberLimit() {
  const { members = [] } = useMemberList();
  return useQuota('teamMemberLimit', members.length);
}

export function useSessionsLimit(currentUsage: number) {
  return useQuota('sessionsLimit', currentUsage);
}
