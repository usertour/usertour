import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { ThemeListProvider, useThemeListContext } from '@/contexts/theme-list-context';
import { NewItemButton, SettingsPage } from '@usertour/ui';
import { ThemeListSkeleton } from './components/theme-list-skeleton';
import type { Theme } from '@usertour/types';
import { ThemeCreateDialog } from './components/theme-create-dialog';
import { ThemeCardPreview } from './components/theme-card-preview';

const NewThemeButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        disabled={isViewOnly}
        label={t('themes.listHeader.newTheme')}
      />
      <ThemeCreateDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

const ThemeListPage = () => {
  // Skipping `isRefetching` here on purpose — Apollo's `loading` flag stays
  // false for refetches, so the grid updates in place instead of flashing
  // back to the skeleton when a theme is created/duplicated/deleted.
  const { themeList, loading, refetch } = useThemeListContext();
  const { t } = useTranslation();

  return (
    <SettingsPage
      title={t('common.theme')}
      actions={<NewThemeButton onSuccess={refetch} />}
      description={<p>{t('themes.listHeader.description')}</p>}
    >
      {loading ? (
        // 3 cards is a closer match to the typical project (1 default
        // theme + maybe 1–2 custom) than the previous fixed 9 placeholder.
        <ThemeListSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {themeList?.map((theme: Theme) => (
            <ThemeCardPreview theme={theme} key={theme.id} />
          ))}
        </div>
      )}
    </SettingsPage>
  );
};

export const SettingsThemeList = () => {
  const { project } = useAppContext();

  return (
    <ThemeListProvider projectId={project?.id}>
      <ThemeListPage />
    </ThemeListProvider>
  );
};

SettingsThemeList.displayName = 'SettingsThemeList';
