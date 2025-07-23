import { useMutation } from '@apollo/client';
import { StarFilledIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { setDefaultTheme } from '@usertour-packages/gql';
import { CopyIcon, Delete2Icon } from '@usertour-packages/icons';
import { getErrorMessage } from '@usertour-packages/utils';
import { Theme } from '@usertour-packages/types';
import { useToast } from '@usertour-packages/use-toast';
import { ReactNode, useState } from 'react';
import { ThemeDeleteForm } from './theme-delete-form';
import { ThemeDuplicateForm } from './theme-duplicate-form';

type ThemeEditDropdownMenuProps = {
  theme: Theme;
  children: ReactNode;
  onSubmit: (action: string) => void;
  disabled?: boolean;
};
export const ThemeEditDropdownMenu = (props: ThemeEditDropdownMenuProps) => {
  const { theme, children, onSubmit, disabled = false } = props;
  const [setDefaultThemeMutation] = useMutation(setDefaultTheme);
  const [openDelete, setOpenDelete] = useState(false);
  const [openDuplicate, setOpenDuplicate] = useState(false);
  const { toast } = useToast();

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
      await setDefaultThemeMutation({
        variables: {
          themeId: theme.id,
        },
      });
      onSubmit('setAsDefault');
      toast({
        variant: 'success',
        title: 'The theme has been successfully set as default',
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
          <DropdownMenuItem onClick={handleSetAsDefault}>
            <StarFilledIcon className="mr-1" width={15} height={15} />
            Set as company default
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDuplicateOpen}>
            <CopyIcon className="mr-1" width={15} height={15} />
            Duplicate theme
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={handleOnClick}
            disabled={theme.isSystem}
          >
            <Delete2Icon className="mr-1" />
            Delete theme
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ThemeDuplicateForm
        duplicateTheme={theme}
        open={openDuplicate}
        onOpenChange={setOpenDuplicate}
        onSuccess={handleDuplicateSuccess}
      />
      <ThemeDeleteForm
        data={theme}
        open={openDelete}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          onSubmit('delete');
        }}
      />
    </>
  );
};

ThemeEditDropdownMenu.displayName = 'ThemeEditDropdownMenu';
