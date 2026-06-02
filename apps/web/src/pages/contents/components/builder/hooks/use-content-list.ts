import { useContentListQuery } from '@usertour/hooks';
import { useEnvironmentId } from '@/pages/contents/components/builder/core';

// Builder-local wrapper over the shared `useContentListQuery`. The
// builder needs the FULL content list (all types — e.g. the
// resource-center content-list block), so the app-level type-filtered
// `use-content-list` doesn't fit. No `type` filter means all types;
// the shared hook defaults `pagination: { first: 1000 }` and
// `orderBy: createdAt desc`, matching the previous inline behavior.
// environmentId is immutable config (set at Provider mount), so the
// query fires on mount — no skip guard.

export const useContentList = () => {
  const environmentId = useEnvironmentId();
  const { contents, loading } = useContentListQuery({ query: { environmentId } });
  return { contents, loading };
};
