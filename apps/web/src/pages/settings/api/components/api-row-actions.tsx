import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { EyeOpenIcon } from '@radix-ui/react-icons';
import { Delete2Icon } from '@usertour/icons';
import {
  type AccessToken,
  useDeleteAccessTokenMutation,
  useGetAccessTokenQuery,
} from '@usertour/hooks';
import { DestructiveConfirmDialog, ResourceRowActions, useToast } from '@usertour/ui';
import { useApiContext } from '@/contexts/api-context';
import { useAppContext } from '@/contexts/app-context';
import { ApiKeyDialog } from './api-key-dialog';

interface ApiRowActionsProps {
  token: AccessToken;
  environmentId: string;
}

export const ApiRowActions = (props: ApiRowActionsProps) => {
  const { token, environmentId } = props;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [shouldFetchToken, setShouldFetchToken] = useState(false);
  const { refetch } = useApiContext();
  const { isViewOnly } = useAppContext();
  const { invoke: deleteAccessToken, loading: isDeleting } = useDeleteAccessTokenMutation();
  const { data: fullToken, loading: isTokenLoading } = useGetAccessTokenQuery(
    environmentId,
    token.id,
    { skip: !shouldFetchToken },
  );
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleReveal = () => {
    setRevealOpen(true);
    setShouldFetchToken(true);
  };

  const handleDelete = async () => {
    try {
      const success = await deleteAccessToken(environmentId, token.id);
      if (success) {
        toast({ variant: 'success', title: t('settings.api.deleteSuccess') });
        setDeleteOpen(false);
        refetch();
      } else {
        toast({ variant: 'destructive', title: t('settings.api.deleteFailure') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('settings.api.deleteFailure') });
    }
  };

  return (
    <>
      <ResourceRowActions
        items={[
          {
            key: 'reveal',
            icon: <EyeOpenIcon className="w-4 h-4 mr-2" />,
            label: t('settings.api.revealMenuItem'),
            onSelect: handleReveal,
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.api.deleteMenuItem'),
            destructive: true,
            disabled: isViewOnly,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <DestructiveConfirmDialog
        title={t('settings.common.deleteConfirm.title', {
          resource: t('settings.api.deleteResource'),
        })}
        description={
          <Trans
            i18nKey="settings.common.deleteConfirm.description"
            values={{ name: token.name }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('settings.common.deleteConfirm.confirm', {
          resource: t('settings.api.deleteResource'),
        })}
        cancelLabel={t('settings.common.cancel')}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
      <ApiKeyDialog
        token={fullToken || ''}
        open={revealOpen}
        onOpenChange={(open) => {
          setRevealOpen(open);
          if (!open) {
            setShouldFetchToken(false);
          }
        }}
        description={isTokenLoading ? t('settings.api.keyDialogLoading') : undefined}
      />
    </>
  );
};

ApiRowActions.displayName = 'ApiRowActions';
