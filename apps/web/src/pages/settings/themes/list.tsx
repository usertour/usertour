import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { ThemeListProvider, useThemeListContext } from '@/contexts/theme-list-context';
import { ThemeListSkeleton } from '@/components/molecules/skeleton';
import { Button } from '@usertour/button';
import { RiAddLine } from '@usertour/icons';
import { SettingsPage } from '@usertour/ui';
import type { Theme } from '@usertour/types';
import { ThemeCreateForm } from './components/theme-create-form';
import { ThemeCardPreview } from './components/theme-card-preview';

const NewThemeButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={isViewOnly}>
        <RiAddLine className="mr-2 h-4 w-4" />
        {t('themes.listHeader.newTheme')}
      </Button>
      <ThemeCreateForm
        isOpen={open}
        onDialogClose={() => setOpen(false)}
        onClose={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

const ThemeListPage = () => {
  const { themeList, loading, isRefetching, refetch } = useThemeListContext();
  const { t } = useTranslation();

  return (
    <SettingsPage
      title={t('common.theme')}
      actions={<NewThemeButton onSuccess={refetch} />}
      description={<p>{t('themes.listHeader.description')}</p>}
    >
      {loading || isRefetching ? (
        <ThemeListSkeleton count={9} />
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
