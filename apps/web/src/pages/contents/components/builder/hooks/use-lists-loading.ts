import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from './use-content-list';
import { useThemeList } from '@/hooks/use-theme-list';

// True while any of the builder's shared lists (theme / attribute /
// content) is still loading. Each underlying hook reads Apollo's
// normalized cache, which is already populated by the ~30 other call
// sites across the tree — so observing them here adds no network
// traffic. Used alongside `ready` from useBuilderInit to gate the
// initial loading screen.
export const useListsLoading = (): boolean => {
  const { loading: themeListLoading } = useThemeList();
  const { loading: attributeListLoading } = useAttributeList();
  const { loading: contentListLoading } = useContentList();
  return themeListLoading || attributeListLoading || contentListLoading;
};
