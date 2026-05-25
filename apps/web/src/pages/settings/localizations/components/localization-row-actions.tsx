import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { StarFilledIcon } from '@radix-ui/react-icons';
import { EditIcon } from '@usertour/icons';
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

export const LocalizationRowActions = ({ localization }: LocalizationRowActionsProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refetch } = useLocalizationListContext();
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
