import { useMutation } from '@apollo/client';
import { deleteLocalization } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { Localization } from '@usertour/types';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LocalizationDeleteDialogProps {
  data: Localization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const LocalizationDeleteDialog = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: LocalizationDeleteDialogProps) => {
  const [deleteMutation] = useMutation(deleteLocalization);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!data) {
      return;
    }
    setLoading(true);
    try {
      const result = await deleteMutation({ variables: { id: data.id } });
      if (result.data?.deleteLocalization?.id) {
        toast({
          variant: 'success',
          title: t('settings.localizations.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
      }
    } catch (error) {
      onSubmit(false);
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DeleteConfirmDialog
      resourceLabel={t('settings.localizations.deleteResource')}
      name={data.name}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
      confirmLabel={t('settings.common.submit')}
    />
  );
};

LocalizationDeleteDialog.displayName = 'LocalizationDeleteDialog';
