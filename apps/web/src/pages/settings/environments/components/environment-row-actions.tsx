import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { StarIcon } from '@radix-ui/react-icons';
import { getErrorMessage } from '@usertour/helpers';
import { useUpdateEnvironmentMutation } from '@usertour/hooks';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { Environment } from '@usertour/types';
import { ResourceRowActions, useToast } from '@usertour/ui';
import { EnvironmentDeleteDialog } from './environment-delete-dialog';
import { EnvironmentEditDialog } from './environment-edit-dialog';

interface EnvironmentRowActionsProps {
  environment: Environment;
  environmentCount?: number;
}

export const EnvironmentRowActions = (props: EnvironmentRowActionsProps) => {
  const { environment, environmentCount = 0 } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refetch } = useEnvironmentListContext();
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke: updateEnvironment, loading: isSettingPrimary } = useUpdateEnvironmentMutation();

  // Primary environments can't be deleted, and you can't delete the last
  // remaining environment. View-only roles can't mutate either.
  const isDeleteDisabled = environmentCount <= 1 || isViewOnly || environment.isPrimary === true;
  const isNotPrimary = environment.isPrimary !== true;

  const handleSetPrimary = async () => {
    if (isViewOnly || isSettingPrimary) {
      return;
    }
    try {
      const success = await updateEnvironment({
        id: environment.id,
        name: environment.name,
        isPrimary: true,
      });
      if (success) {
        toast({ variant: 'success', title: t('settings.environments.setPrimarySuccess') });
        refetch();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <>
      <ResourceRowActions
        disabled={isViewOnly}
        contentClassName="w-72"
        items={[
          {
            key: 'rename',
            icon: <EditIcon className="w-6" width={12} height={12} />,
            label: t('settings.environments.renameMenuItem'),
            onSelect: () => setEditOpen(true),
          },
          ...(isNotPrimary
            ? [
                {
                  key: 'setPrimary',
                  icon: <StarIcon className="w-4 h-4 mr-2" />,
                  label: t('settings.environments.setPrimaryMenuItem'),
                  onSelect: handleSetPrimary,
                  disabled: isViewOnly || isSettingPrimary,
                  separatorBefore: true,
                },
              ]
            : []),
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.environments.deleteMenuItem'),
            destructive: true,
            disabled: isDeleteDisabled,
            separatorBefore: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <EnvironmentEditDialog
        environment={environment}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={() => refetch()}
      />
      <EnvironmentDeleteDialog
        data={environment}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={() => {
          setDeleteOpen(false);
          refetch();
        }}
      />
    </>
  );
};

EnvironmentRowActions.displayName = 'EnvironmentRowActions';
