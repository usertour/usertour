import { Icons } from '@/components/atoms/icons';
import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useMutation } from '@apollo/client';
import { ArrowLeftIcon, DotsHorizontalIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { updateTheme } from '@usertour-packages/gql';
import { EditIcon } from '@usertour-packages/icons';
import { getErrorMessage } from '@usertour-packages/shared-utils';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeEditDropdownMenu } from './theme-edit-dropmenu';
import { ThemeRenameForm } from './theme-rename-form';
import { useAppContext } from '@/contexts/app-context';

export const ThemeDetailHeader = () => {
  const { theme, settings, refetch, variations } = useThemeDetailContext();
  const { projectId } = useParams();
  const [updateMutation] = useMutation(updateTheme);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigator = useNavigate();
  const { toast } = useToast();
  const { isViewOnly } = useAppContext();
  const handleSaveTheme = async () => {
    if (!theme) {
      return;
    }
    try {
      setIsLoading(true);
      await updateMutation({
        variables: {
          id: theme.id,
          name: theme.name,
          settings: settings,
          variations: variations,
        },
      });
      refetch();
      setIsLoading(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  };

  const navigateToThemesListPage = () => {
    if (projectId) {
      navigator(`/project/${projectId}/settings/themes`);
    }
  };

  const handleOnSubmit = (action: string) => {
    if (action === 'delete') {
      navigateToThemesListPage();
    }
  };

  return (
    <div className="border-b bg-white flex-col md:flex w-full fixed z-[10]">
      <div className="flex h-16 items-center px-4">
        <ArrowLeftIcon className="ml-4 h-6 w-8 cursor-pointer" onClick={navigateToThemesListPage} />
        <span>{theme?.name}</span>
        {theme?.isSystem && (
          <>
            <InfoCircledIcon className="ml-4 mr-0.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ">
              This is a standard theme, managed by Usertour
            </span>
          </>
        )}
        {!theme?.isSystem && (
          <ThemeRenameForm
            data={theme}
            onSubmit={() => {
              refetch();
            }}
          >
            <Button variant={'ghost'} className="hover:bg-transparent" disabled={isViewOnly}>
              <EditIcon className="cursor-pointer" width={16} height={16} />
            </Button>
          </ThemeRenameForm>
        )}
        {/* <MainNav className="mx-6" /> */}
        <div className="ml-auto flex items-center space-x-4">
          <Button onClick={handleSaveTheme} disabled={theme?.isSystem || isViewOnly}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <ThemeEditDropdownMenu theme={theme!} onSubmit={handleOnSubmit}>
            <Button variant="secondary" disabled={isViewOnly}>
              <span className="sr-only">Actions</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </ThemeEditDropdownMenu>
        </div>
      </div>
    </div>
  );
};

ThemeDetailHeader.displayName = 'ThemeDetailHeader';
