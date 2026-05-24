import { Attribute } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteAttributeMutation } from '@usertour/hooks';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useTranslation } from 'react-i18next';

interface AttributeDeleteFormProps {
  data: Attribute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const AttributeDeleteForm = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: AttributeDeleteFormProps) => {
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
    <DeleteConfirmDialog
      resourceLabel={t('settings.attributes.deleteResource')}
      name={data.displayName}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={isDeleting}
      confirmLabel={t('settings.common.submit')}
    />
  );
};

AttributeDeleteForm.displayName = 'AttributeDeleteForm';
