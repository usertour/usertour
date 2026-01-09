import { useAppContext } from '@/contexts/app-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { Button } from '@usertour-packages/button';
import { useState } from 'react';
import { ThemeCreateForm } from './theme-create-form';
import { PlusIcon } from 'lucide-react';

import { useTranslation } from 'react-i18next';

export const ThemeListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useThemeListContext();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();
  const handleCreateTheme = () => {
    setOpen(true);
  };
  const handleDialogClose = () => {
    setOpen(false);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">{t('common.theme')}</h3>
            <Button onClick={handleCreateTheme} disabled={isViewOnly}>
              <PlusIcon className="h-4 w-4" />
              {t('themes.listHeader.newTheme')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{t('themes.listHeader.description')}</p>
          </div>
        </div>
      </div>
      <ThemeCreateForm isOpen={open} onDialogClose={handleDialogClose} onClose={handleOnClose} />
    </>
  );
};

ThemeListHeader.displayName = 'ThemeListHeader';
