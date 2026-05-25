import { Attribute } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteAttributeMutation } from '@usertour/hooks';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { Trans, useTranslation } from 'react-i18next';

interface AttributeDeleteDialogProps {
  data: Attribute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const AttributeDeleteDialog = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: AttributeDeleteDialogProps) => {
  const { invoke: deleteAttribute, loading: isDeleting } = useDeleteAttributeMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!data) {
      return;
    }
    try {
      const success = await deleteAttribute(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.attributes.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <DestructiveConfirmDialog
      title={t('settings.common.deleteConfirm.title', {
        resource: t('settings.attributes.deleteResource'),
      })}
      description={
        <Trans
          i18nKey="settings.common.deleteConfirm.description"
          values={{ name: data.displayName }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.common.deleteConfirm.confirm', {
        resource: t('settings.attributes.deleteResource'),
      })}
      cancelLabel={t('settings.common.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={isDeleting}
    />
  );
};

AttributeDeleteDialog.displayName = 'AttributeDeleteDialog';
