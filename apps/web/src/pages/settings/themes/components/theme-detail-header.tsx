import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useMutation } from '@apollo/client';
import { ArrowLeftIcon, DotsHorizontalIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { Button } from '@usertour-packages/button';
import { updateTheme } from '@usertour-packages/gql';
import { EditIcon, SpinnerIcon } from '@usertour-packages/icons';
import { getErrorMessage, isEqual } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useEvent } from 'react-use';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeEditDropdownMenu } from './theme-edit-dropmenu';
import { ThemeRenameForm } from './theme-rename-form';
import { useAppContext } from '@/contexts/app-context';

export const ThemeDetailHeader = () => {
  const { theme, settings, refetch, variations } = useThemeDetailContext();
  const { projectId } = useParams();
  const [updateMutation] = useMutation(updateTheme);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState<boolean>(false);
  const navigator = useNavigate();
  const { toast } = useToast();
  const { isViewOnly } = useAppContext();

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!theme) {
      return false;
    }
    return !isEqual(theme.settings, settings) || !isEqual(theme.variations ?? [], variations);
  };

  // Warn user when closing page with unsaved changes
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges()) {
      e.preventDefault();
    }
  });

  const handleSaveTheme = async () => {
    if (!theme || !settings) {
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
    if (hasUnsavedChanges()) {
      setShowUnsavedDialog(true);
      return;
    }
    if (projectId) {
      navigator(`/project/${projectId}/settings/themes`);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedDialog(false);
    if (projectId) {
      navigator(`/project/${projectId}/settings/themes`);
    }
  };

  const handleOnSubmit = (action: string) => {
    if (action === 'delete') {
      // Navigate directly after delete, no need to check for unsaved changes
      if (projectId) {
        navigator(`/project/${projectId}/settings/themes`);
      }
    }
  };

  return (
    <>
      <div className="border-b bg-white flex-col md:flex w-full fixed z-[10]">
        <div className="flex h-16 items-center px-4">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={navigateToThemesListPage}
          />
          <span>{theme?.name}</span>
          {theme?.isSystem && (
            <>
              <InfoCircledIcon className="ml-4 mr-0.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground ">
                This is a standard theme, managed by Usertour
              </span>
            </>
          )}
          {!theme?.isSystem && theme && (
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
              {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
            {theme && (
              <ThemeEditDropdownMenu theme={theme} onSubmit={handleOnSubmit}>
                <Button variant="secondary" disabled={isViewOnly}>
                  <span className="sr-only">Actions</span>
                  <DotsHorizontalIcon className="h-4 w-4" />
                </Button>
              </ThemeEditDropdownMenu>
            )}
          </div>
        </div>
      </div>
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Discard changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

ThemeDetailHeader.displayName = 'ThemeDetailHeader';
