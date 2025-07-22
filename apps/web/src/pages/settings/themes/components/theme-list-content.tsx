import { ThemeListSkeleton } from '@/components/molecules/skeleton';
import { useThemeListContext } from '@/contexts/theme-list-context';
import type { Theme } from '@usertour-ui/types';
import { ThemeListPreview } from './theme-list-preview';

export const ThemeListContent = () => {
  const { themeList, loading, isRefetching } = useThemeListContext();

  if (loading || isRefetching) {
    return <ThemeListSkeleton count={9} />;
  }

  return (
    <div className="flex flex-wrap gap-4 ">
      {themeList?.map((theme: Theme) => (
        <ThemeListPreview theme={theme} key={theme.id} />
      ))}
    </div>
  );
};

ThemeListContent.displayName = 'ThemeListContent';
