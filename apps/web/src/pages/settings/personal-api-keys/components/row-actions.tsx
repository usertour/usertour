import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Delete2Icon } from '@usertour/icons';
import { type ApiToken, useRevokeApiTokenMutation } from '@usertour/hooks';
import { DestructiveConfirmDialog, ResourceRowActions, useToast } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';

interface RowActionsProps {
  token: ApiToken;
}

/**
 * Row actions for a personal API token. Revoke only — the secret is hashed
 * at rest, so there's no "reveal" action (no get-single-token query). Revoke
 * is a soft deactivate; the parent list refetches via the mutation's
 * refetchQueries so the row flips to a "Revoked" status in place.
 */
export const RowActions = (props: RowActionsProps) => {
  const { token } = props;
  const [revokeOpen, setRevokeOpen] = useState(false);
  const { isViewOnly } = useAppContext();
  const { invoke: revokeApiToken, loading: isRevoking } = useRevokeApiTokenMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Already revoked tokens can't be revoked again; view-only roles can't
  // revoke at all.
  const revokeDisabled = !token.isActive || isViewOnly;

  const handleRevoke = async () => {
    try {
      const success = await revokeApiToken(token.id);
      if (success) {
        toast({ variant: 'success', title: t('settings.personalApiKeys.revokeSuccess') });
        setRevokeOpen(false);
      } else {
        toast({ variant: 'destructive', title: t('settings.personalApiKeys.revokeFailure') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('settings.personalApiKeys.revokeFailure') });
    }
  };

  return (
    <>
      <ResourceRowActions
        items={[
          {
            key: 'revoke',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: t('settings.personalApiKeys.revokeMenuItem'),
            destructive: true,
            disabled: revokeDisabled,
            onSelect: () => setRevokeOpen(true),
          },
        ]}
      />
      <DestructiveConfirmDialog
        title={t('settings.common.deleteConfirm.title', {
          resource: t('settings.personalApiKeys.revokeResource'),
        })}
        description={
          <Trans
            i18nKey="settings.common.deleteConfirm.description"
            values={{ name: token.name }}
            components={{ strong: <strong className="font-bold text-foreground" /> }}
          />
        }
        confirmLabel={t('settings.common.deleteConfirm.confirm', {
          resource: t('settings.personalApiKeys.revokeResource'),
        })}
        cancelLabel={t('settings.common.cancel')}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onConfirm={handleRevoke}
        loading={isRevoking}
      />
    </>
  );
};

RowActions.displayName = 'RowActions';
