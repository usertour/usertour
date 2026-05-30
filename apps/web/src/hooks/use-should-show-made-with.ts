import { useGetProjectConfigQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useActiveProject } from './use-active-project';

// Lightweight reader for the "Made with Usertour" badge gate. Backed by
// `getProjectConfig` only — distinct from `useSubscription`, which
// pulls three queries (subscription / project config / usage) and is
// overkill on pages that just want the badge state.
//
// Each theme-preview-* component reads this; the previous shape had
// every one of them instantiating `useSubscription`, which meant ~15
// extra ObservableQuery subscriptions on the theme builder for data
// they didn't read. Apollo's network dedup coalesced the actual
// requests, but each useQuery still spun up its own cache watcher
// chain.
//
// Note: the loading branch returns `false` (same as `useSubscription`)
// to avoid a one-frame badge flash before the config lands. Once
// resolved, `removeBranding === true` means the user has paid to hide
// the badge.
export const useShouldShowMadeWith = (): boolean => {
  const project = useActiveProject();
  const { projectConfig, loading } = useGetProjectConfigQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  if (loading) {
    return false;
  }
  return !(projectConfig?.removeBranding ?? false);
};
