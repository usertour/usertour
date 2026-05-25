import { DestructiveConfirmDialog } from '@usertour/ui';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteContentMutation } from '@usertour/hooks';
import { Content, ContentDataType } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { getContentTypeMeta } from './content-type-meta';

interface ContentDeleteFormProps {
  content: Content;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const ContentDeleteForm = ({
  content,
  open,
  onOpenChange,
  onSubmit,
}: ContentDeleteFormProps) => {
  const { invoke: deleteContent, loading } = useDeleteContentMutation();
  const { toast } = useToast();
  const { t } = useTranslation();
  // singular noun for the content kind, e.g. 'flow', 'checklist', 'banner'.
  const contentType = getContentTypeMeta(content.type || ContentDataType.FLOW).singular;
  const contentName = content.name;

  const handleConfirm = useCallback(async () => {
    if (!content?.id) {
      toast({ variant: 'destructive', title: t('contents.deleteDialog.invalidData') });
      return;
    }

    try {
      const success = await deleteContent(content.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('contents.deleteDialog.deleteSuccess', {
            contentType,
            name: contentName,
          }),
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: t('contents.deleteDialog.deleteFailure') });
        onSubmit(false);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
      onSubmit(false);
    }
  }, [content?.id, contentType, contentName, deleteContent, toast, onSubmit, onOpenChange, t]);

  return (
    <DestructiveConfirmDialog
      title={t('contents.deleteDialog.title', { contentType })}
      description={
        <Trans
          i18nKey="contents.deleteDialog.description"
          values={{ name: contentName }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('contents.deleteDialog.confirmButton', { contentType })}
      cancelLabel={t('contents.deleteDialog.cancelButton')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
};

ContentDeleteForm.displayName = 'ContentDeleteForm';
