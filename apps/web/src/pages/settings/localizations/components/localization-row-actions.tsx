import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { StarFilledIcon } from '@radix-ui/react-icons';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useSetDefaultLocalizationMutation } from '@usertour/hooks';
import { Localization } from '@usertour/types';
import { ResourceRowActions } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { LocalizationDeleteDialog } from './localization-delete-dialog';
import { LocalizationEditDialog } from './localization-edit-dialog';

interface LocalizationRowActionsProps {
  localization: Localization;
}

export const LocalizationRowActions = (props: LocalizationRowActionsProps) => {
  const { localization } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refetch } = useLocalizationListContext();
  const { isViewOnly } = useAppContext();
  const { invoke: setDefaultLocalization } = useSetDefaultLocalizationMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSetDefault = async () => {
    try {
      await setDefaultLocalization(localization.id);
      await refetch();
      toast({
        variant: 'success',
        title: t('settings.localizations.setDefaultSuccess'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <>
      <ResourceRowActions
        align="start"
        disabled={isViewOnly}
        items={[
          {
            key: 'edit',
            icon: <EditIcon className="w-6" width={12} height={12} />,
            label: t('settings.localizations.editMenuItem'),
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'default',
            icon: <StarFilledIcon className="mr-1" width={15} height={15} />,
            label: t('settings.localizations.setDefaultMenuItem'),
            onSelect: handleSetDefault,
            disabled: localization.isDefault,
            separatorBefore: true,
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-6" width={16} height={16} />,
            label: t('settings.localizations.deleteMenuItem'),
            destructive: true,
            // Default locale can't be deleted — server rejects and the UI
            // would otherwise let the user reach a doomed confirm dialog.
            disabled: localization.isDefault,
            separatorBefore: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <LocalizationEditDialog
        localization={localization}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={() => refetch()}
      />
      <LocalizationDeleteDialog
        data={localization}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={() => refetch()}
      />
    </>
  );
};

LocalizationRowActions.displayName = 'LocalizationRowActions';
