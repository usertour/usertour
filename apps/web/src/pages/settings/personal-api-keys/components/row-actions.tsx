import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowRightLeftIcon, Delete2Icon, EditIcon } from '@usertour/icons';
import {
  type ApiToken,
  useDeleteApiTokenMutation,
  useRotateApiTokenMutation,
} from '@usertour/hooks';
import { DestructiveConfirmDialog, ResourceRowActions, useToast } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { EditDialog } from './edit-dialog';
import { RevealDialog } from './reveal-dialog';

interface RowActionsProps {
  token: ApiToken;
}

/**
 * Row actions for a personal API token: Edit (name/projects/scopes), Rotate
 * (mint a fresh secret on the same record — shown once), and Delete (hard
 * remove). Each mutation refetches the list via `refetchQueries`. View-only
 * roles can't manage tokens.
 */
export const RowActions = (props: RowActionsProps) => {
  const { token } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rotatedToken, setRotatedToken] = useState('');
  const { isViewOnly } = useAppContext();
  const { invoke: rotateApiToken, loading: isRotating } = useRotateApiTokenMutation();
  const { invoke: deleteApiToken, loading: isDeleting } = useDeleteApiTokenMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleRotate = async () => {
    try {
      const result = await rotateApiToken(token.id);
      if (result) {
        setRotateOpen(false);
        setRotatedToken(result.token);
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
            disabled: isViewOnly,
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'rotate',
            icon: <ArrowRightLeftIcon className="w-4 h-4 mr-2" />,
            label: t('settings.personalApiKeys.rotateMenuItem'),
            disabled: isViewOnly,
            onSelect: () => setRotateOpen(true),
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.personalApiKeys.deleteMenuItem'),
            destructive: true,
            separatorBefore: true,
            disabled: isViewOnly,
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

      <RevealDialog
        token={rotatedToken}
        open={!!rotatedToken}
        onOpenChange={() => setRotatedToken('')}
      />
    </>
  );
};

RowActions.displayName = 'RowActions';
