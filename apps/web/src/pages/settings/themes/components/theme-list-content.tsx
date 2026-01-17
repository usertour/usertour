import { ThemeListSkeleton } from '@/components/molecules/skeleton';
import { useThemeListContext } from '@/contexts/theme-list-context';
import type { Theme } from '@usertour/types';
import { ThemeListPreview } from './theme-list-preview';

export const ThemeListContent = () => {
  const { themeList, loading, isRefetching } = useThemeListContext();

  if (loading || isRefetching) {
    return <ThemeListSkeleton count={9} />;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
      {themeList?.map((theme: Theme) => (
        <ThemeListPreview theme={theme} key={theme.id} />
      ))}
    </div>
  );
};

ThemeListContent.displayName = 'ThemeListContent';
