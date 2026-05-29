import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useListThemesQuery } from '@usertour/hooks';
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

export const SettingsThemeList = () => {
  const { project } = useAppContext();
  // Skipping `isRefetching` here on purpose — Apollo's `loading` flag stays
  // false for refetches, so the grid updates in place instead of flashing
  // back to the skeleton when a theme is created/duplicated/deleted.
  // Single owner of the themes query; ThemeCardPreview takes `refetch`
  // via prop instead of re-subscribing per card.
  const { themeList, loading, refetch } = useListThemesQuery(project?.id);
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
            <ThemeCardPreview theme={theme} key={theme.id} onMutationSuccess={refetch} />
          ))}
        </div>
      )}
    </SettingsPage>
  );
};

SettingsThemeList.displayName = 'SettingsThemeList';
