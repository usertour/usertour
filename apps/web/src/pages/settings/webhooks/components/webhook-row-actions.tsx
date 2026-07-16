import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type Webhook, useDeleteWebhookMutation } from '@usertour/hooks';
import { Delete2Icon, EditIcon, RiEyeLine } from '@usertour/icons';
import { DestructiveConfirmDialog, ResourceRowActions, useToast } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { WebhookDialog } from './webhook-dialog';

export interface WebhookRowActionsProps {
  webhook: Webhook;
}

export const WebhookRowActions = (props: WebhookRowActionsProps) => {
  const { webhook } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { isViewOnly, project } = useAppContext();
  const { invoke: deleteWebhook, loading: isDeleting } = useDeleteWebhookMutation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    try {
      const success = await deleteWebhook(webhook.id);
      if (success) {
        toast({ variant: 'success', title: t('settings.webhooks.deleteSuccess') });
        setDeleteOpen(false);
      } else {
        toast({ variant: 'destructive', title: t('settings.webhooks.deleteFailure') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('settings.webhooks.deleteFailure') });
    }
  };

  return (
    <>
      <ResourceRowActions
        items={[
          {
            key: 'details',
            icon: <RiEyeLine className="w-4 h-4 mr-2" />,
            label: t('settings.webhooks.detailsMenuItem'),
            onSelect: () => navigate(`/project/${project?.id}/settings/webhooks/${webhook.id}`),
          },
          {
            key: 'edit',
            icon: <EditIcon className="w-4 h-4 mr-2" />,
            label: t('settings.webhooks.editMenuItem'),
            disabled: isViewOnly,
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.webhooks.deleteMenuItem'),
            destructive: true,
            separatorBefore: true,
            disabled: isViewOnly,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />

      <WebhookDialog webhook={webhook} open={editOpen} onOpenChange={setEditOpen} />

      <DestructiveConfirmDialog
        title={t('settings.common.deleteConfirm.title', {
          resource: t('settings.webhooks.deleteResource'),
        })}
        description={
          <Trans
            i18nKey="settings.common.deleteConfirm.description"
            values={{ name: webhook.url }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('settings.common.deleteConfirm.confirm', {
          resource: t('settings.webhooks.deleteResource'),
        })}
        cancelLabel={t('settings.common.cancel')}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </>
  );
};

WebhookRowActions.displayName = 'WebhookRowActions';
