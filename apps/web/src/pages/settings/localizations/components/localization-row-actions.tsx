import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { Delete2Icon, EditIcon, RiStarLine } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useSetDefaultLocalizationMutation } from '@usertour/hooks';
import { Localization } from '@usertour/types';
import { ResourceRowActions, useToast } from '@usertour/ui';
import { LocalizationDeleteDialog } from './localization-delete-dialog';
import { LocalizationEditDialog } from './localization-edit-dialog';

interface LocalizationRowActionsProps {
  localization: Localization;
}

export const LocalizationRowActions = (props: LocalizationRowActionsProps) => {
  const { localization } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { isViewOnly } = useAppContext();
  const { invoke: setDefaultLocalization } = useSetDefaultLocalizationMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSetDefault = async () => {
    try {
      await setDefaultLocalization(localization.id);
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
            icon: <EditIcon className="w-4 h-4 mr-2" />,
            label: t('settings.localizations.editMenuItem'),
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'default',
            icon: <RiStarLine className="w-4 h-4 mr-2" />,
            label: t('settings.localizations.setDefaultMenuItem'),
            onSelect: handleSetDefault,
            disabled: localization.isDefault,
            separatorBefore: true,
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.localizations.deleteMenuItem'),
            destructive: true,
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
        onSubmit={() => {}}
      />
      <LocalizationDeleteDialog
        data={localization}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={() => {}}
      />
    </>
  );
};

LocalizationRowActions.displayName = 'LocalizationRowActions';
