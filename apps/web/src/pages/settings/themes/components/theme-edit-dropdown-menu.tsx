import { useTranslation } from 'react-i18next';
import { StarFilledIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { useSetDefaultThemeMutation } from '@usertour/hooks';
import { CopyIcon, Delete2Icon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { useToast } from '@usertour/ui';
import { ReactNode, useState } from 'react';
import { ThemeDeleteDialog } from './theme-delete-dialog';
import { ThemeDuplicateDialog } from './theme-duplicate-dialog';

type ThemeEditDropdownMenuProps = {
  theme: Theme;
  children: ReactNode;
  onSubmit: (action: string) => void;
  disabled?: boolean;
};
export const ThemeEditDropdownMenu = (props: ThemeEditDropdownMenuProps) => {
  const { theme, children, onSubmit, disabled = false } = props;
  const { invoke: setDefaultTheme } = useSetDefaultThemeMutation();
  const [openDelete, setOpenDelete] = useState(false);
  const [openDuplicate, setOpenDuplicate] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleOnClick = () => {
    setOpenDelete(true);
  };

  const handleDuplicateOpen = () => {
    setOpenDuplicate(true);
  };
  const handleDuplicateSuccess = () => {
    setOpenDuplicate(false);
    onSubmit('duplicate');
  };

  const handleSetAsDefault = async () => {
    try {
      await setDefaultTheme(theme.id);
      onSubmit('setAsDefault');
      toast({
        variant: 'success',
        title: t('settings.themes.setDefaultSuccess'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItem onClick={handleSetAsDefault} disabled={theme.isDefault}>
            <StarFilledIcon className="mr-1" width={15} height={15} />
            {t('settings.themes.setDefaultMenuItem')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDuplicateOpen}>
            <CopyIcon className="mr-1" width={15} height={15} />
            {t('settings.themes.duplicateMenuItem')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={handleOnClick}
            disabled={theme.isSystem || theme.isDefault}
          >
            <Delete2Icon className="mr-1" />
            {t('settings.themes.deleteMenuItem')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ThemeDuplicateDialog
        duplicateTheme={theme}
        open={openDuplicate}
        onOpenChange={setOpenDuplicate}
        onSuccess={handleDuplicateSuccess}
      />
      <ThemeDeleteDialog
        data={theme}
        open={openDelete}
        onOpenChange={setOpenDelete}
        // Only escalate `delete` when the server actually confirmed it —
        // theme-detail uses this signal to navigate back to the list,
        // and we don't want a soft-failure to both show a destructive
        // toast AND yank the user off the builder for a theme that
        // wasn't actually deleted.
        onSubmit={(success) => {
          if (success) {
            onSubmit('delete');
          }
        }}
      />
    </>
  );
};

ThemeEditDropdownMenu.displayName = 'ThemeEditDropdownMenu';
