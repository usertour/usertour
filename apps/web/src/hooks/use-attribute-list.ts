import { useListAttributesQuery } from '@usertour/hooks';
import { AttributeBizTypes } from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper. Pulls projectId from `useAppContext` and
// hardcodes `bizType: Nil` to match the previous
// `AttributeListProvider` behaviour. Shared-cache participation lets
// `useCreateAttributeMutation` / `useDeleteAttributeMutation` reach
// the cache slot directly without a Provider hop — matches the v0.8.4
// fix that made "create attribute from Bind to user attribute" stop
// blanking the WebBuilder.
export const useAttributeList = () => {
  const { project } = useAppContext();
  const { attributes, loading, refetch } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !project?.id },
  );
  // Preserve `attributeList` field name so the four call sites stay
  // a single-line rename rather than `{ attributes }` everywhere.
  return { attributeList: attributes, loading, refetch };
};
