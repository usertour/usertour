import { useEffect } from 'react';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useThemeList } from '@/hooks/use-theme-list';

// Keeps store.currentTheme in sync with currentVersion.themeId as the
// theme list loads / the version changes. Extracted out of the routing
// Container so that component stays pure routing.
export const useSyncCurrentTheme = () => {
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const setCurrentTheme = useBuilderStore((state) => state.setCurrentTheme);
  const { themeList } = useThemeList();

  useEffect(() => {
    if (!currentVersion || !themeList) {
      return;
    }
    const theme = themeList.find((item) => item.id === currentVersion.themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [themeList, currentVersion, setCurrentTheme]);
};
