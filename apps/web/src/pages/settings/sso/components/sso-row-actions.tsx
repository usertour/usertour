import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Delete2Icon, RiEditLine, RiFileCopyLine } from '@usertour/icons';
import { type SsoProvider, useDeleteSsoProviderMutation } from '@usertour/hooks';
import { DestructiveConfirmDialog, ResourceRowActions, useToast } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { SsoProviderDialog } from './sso-provider-dialog';

interface SsoRowActionsProps {
  provider: SsoProvider;
  onChanged: () => void;
}

export const SsoRowActions = (props: SsoRowActionsProps) => {
  const { provider, onChanged } = props;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { isViewOnly, globalConfig } = useAppContext();
  const { invoke: deleteProvider } = useDeleteSsoProviderMutation();
  const { toast } = useToast();
  const copy = useCopyWithToast();
  const { t } = useTranslation();

  // Per-provider deep link: launches this IdP directly (skips the picker page).
  const providerLoginLink = `${globalConfig?.apiUrl ?? ''}/api/auth/sso/${provider.id}`;

  const handleDelete = async () => {
    try {
      const success = await deleteProvider(provider.id);
      if (success) {
        toast({ variant: 'success', title: t('settings.sso.deleteSuccess') });
        setDeleteOpen(false);
        onChanged();
      } else {
        toast({ variant: 'destructive', title: t('settings.sso.deleteFailure') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('settings.sso.deleteFailure') });
    }
  };

  return (
    <>
      <ResourceRowActions
        items={[
          {
            key: 'copy-link',
            icon: <RiFileCopyLine className="w-4 h-4 mr-2" />,
            label: t('settings.sso.copyLoginLink'),
            onSelect: () => copy(providerLoginLink, t('settings.sso.loginLinkCopied')),
          },
          {
            key: 'edit',
            icon: <RiEditLine className="w-4 h-4 mr-2" />,
            label: t('settings.sso.editMenuItem'),
            disabled: isViewOnly,
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.sso.deleteMenuItem'),
            destructive: true,
            disabled: isViewOnly,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <SsoProviderDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        provider={provider}
        onSubmit={onChanged}
      />
      <DestructiveConfirmDialog
        title={t('settings.common.deleteConfirm.title', {
          resource: t('settings.sso.deleteResource'),
        })}
        description={
          <Trans
            i18nKey="settings.common.deleteConfirm.description"
            values={{ name: provider.name }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('settings.common.deleteConfirm.confirm', {
          resource: t('settings.sso.deleteResource'),
        })}
        cancelLabel={t('settings.common.cancel')}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </>
  );
};

SsoRowActions.displayName = 'SsoRowActions';
