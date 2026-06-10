import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useThemeList } from '@/hooks/use-theme-list';

// True while any of the builder's shared lists (theme / attribute /
// content) is still loading. Each underlying hook reads Apollo's
// normalized cache, which is already populated by the ~30 other call
// sites across the tree — so observing them here adds no network
// traffic. Used alongside `ready` from useBuilderInit to gate the
// initial loading screen.
export const useListsLoading = (): boolean => {
  const { themeList, loading: themeListLoading } = useThemeList();
  const { attributeList, loading: attributeListLoading } = useAttributeList();
  const { contents, loading: contentListLoading } = useContentList();
  // Gate each list on "loading AND no data yet", mirroring ContentDetailBuilder.
  // A background refetch — e.g. createAttribute's `refetchQueries:
  // ['listAttributes']` from the "Bind to user attribute" picker — flips the
  // bare `loading` true while the cached list is retained. Without the
  // `&& !data` guard that bounces WebBuilderContent back to its loading screen,
  // unmounting the active editor and any dialog open inside it
  // (AttributeCreateForm) — losing the unsaved draft and the pending bind.
  return (
    (themeListLoading && !themeList) ||
    (attributeListLoading && !attributeList) ||
    (contentListLoading && !contents)
  );
};
