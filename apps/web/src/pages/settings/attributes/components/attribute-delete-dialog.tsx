import { Attribute } from '@usertour/types';
import { useDeleteAttributeMutation } from '@usertour/hooks';
import { DestructiveConfirmDialog } from '@usertour/ui';
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
  const { invoke: deleteAttribute } = useDeleteAttributeMutation();
  const { t } = useTranslation();

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
      invoke={() => deleteAttribute(data.id)}
      successToast={t('settings.attributes.deleteSuccess')}
      failureToast={t('settings.attributes.deleteFailure')}
      onSettled={onSubmit}
    />
  );
};

AttributeDeleteDialog.displayName = 'AttributeDeleteDialog';
