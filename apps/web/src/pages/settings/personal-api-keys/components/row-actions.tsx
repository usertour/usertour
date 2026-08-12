import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowRightLeftIcon, Delete2Icon, EditIcon } from '@usertour/icons';
import {
  type ApiToken,
  useDeleteApiTokenMutation,
  useRotateApiTokenMutation,
} from '@usertour/hooks';
import { DestructiveConfirmDialog, ResourceRowActions, useToast } from '@usertour/ui';
import { EditDialog } from './edit-dialog';

interface RowActionsProps {
  token: ApiToken;
  /**
   * Reports the freshly-minted plaintext secret after a rotate. The reveal
   * dialog is owned by the page, NOT this row: the row lives inside the table
   * subtree, which the list page swaps for a skeleton while the post-mutation
   * refetch is in flight — any state held here would be destroyed with it,
   * and the one-time secret is not retrievable again.
   */
  onRotated: (token: string) => void;
}

/**
 * Row actions for a personal API token: Edit (name/projects/scopes), Rotate
 * (mint a fresh secret on the same record — shown once), and Delete (hard
 * remove). Each mutation refetches the list via `refetchQueries`. Personal keys
 * are ACCOUNT-level — the server checks ownership only, so no project-role
 * gating here (a viewer-everywhere user must still be able to revoke their own
 * leaked key).
 */
export const RowActions = (props: RowActionsProps) => {
  const { token, onRotated } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { invoke: rotateApiToken, loading: isRotating } = useRotateApiTokenMutation();
  const { invoke: deleteApiToken, loading: isDeleting } = useDeleteApiTokenMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleRotate = async () => {
    try {
      const result = await rotateApiToken(token.id);
      if (result) {
        setRotateOpen(false);
        onRotated(result.token);
        toast({ variant: 'success', title: t('settings.personalApiKeys.rotateSuccess') });
      } else {
        toast({ variant: 'destructive', title: t('settings.personalApiKeys.rotateFailure') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('settings.personalApiKeys.rotateFailure') });
    }
  };

  const handleDelete = async () => {
    try {
      const success = await deleteApiToken(token.id);
      if (success) {
        toast({ variant: 'success', title: t('settings.personalApiKeys.deleteSuccess') });
        setDeleteOpen(false);
      } else {
        toast({ variant: 'destructive', title: t('settings.personalApiKeys.deleteFailure') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('settings.personalApiKeys.deleteFailure') });
    }
  };

  return (
    <>
      <ResourceRowActions
        items={[
          {
            key: 'edit',
            icon: <EditIcon className="w-4 h-4 mr-2" />,
            label: t('settings.personalApiKeys.editMenuItem'),
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'rotate',
            icon: <ArrowRightLeftIcon className="w-4 h-4 mr-2" />,
            label: t('settings.personalApiKeys.rotateMenuItem'),
            onSelect: () => setRotateOpen(true),
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.personalApiKeys.deleteMenuItem'),
            destructive: true,
            separatorBefore: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />

      <EditDialog token={token} open={editOpen} onOpenChange={setEditOpen} />

      <DestructiveConfirmDialog
        title={t('settings.personalApiKeys.rotateConfirmTitle')}
        description={
          <Trans
            i18nKey="settings.personalApiKeys.rotateConfirmDescription"
            values={{ name: token.name }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('settings.personalApiKeys.rotateConfirmButton')}
        cancelLabel={t('settings.common.cancel')}
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onConfirm={handleRotate}
        loading={isRotating}
      />

      <DestructiveConfirmDialog
        title={t('settings.common.deleteConfirm.title', {
          resource: t('settings.personalApiKeys.deleteResource'),
        })}
        description={
          <Trans
            i18nKey="settings.common.deleteConfirm.description"
            values={{ name: token.name }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('settings.common.deleteConfirm.confirm', {
          resource: t('settings.personalApiKeys.deleteResource'),
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

RowActions.displayName = 'RowActions';
