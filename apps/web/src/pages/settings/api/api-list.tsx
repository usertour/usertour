import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import {
  Alert,
  AlertDescription,
  NewItemButton,
  ResourceListPage,
  type ResourceTableColumn,
} from '@usertour/ui';
import { WarningIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { type AccessToken, useListAccessTokensQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { ApiCreateDialog } from './components/api-create-dialog';
import { ApiRowActions } from './components/api-row-actions';

const NewApiKeyButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton onClick={() => setOpen(true)} label={t('settings.api.newButton')} />
      <ApiCreateDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

export const SettingsApiList = () => {
  const { environment, project } = useAppContext();
  // Skipping `isRefetching` here on purpose — Apollo's `loading` flag stays
  // false for refetches, so the table updates in place instead of flashing
  // back to the skeleton when a token is created/deleted. `!environment`
  // is still part of `loading` to cover initial environment hydration.
  const { accessTokens, loading, refetch } = useListAccessTokensQuery(
    environment?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();

  const columns: ResourceTableColumn<AccessToken>[] = [
    { header: t('settings.api.columns.name'), className: 'truncate', cell: (token) => token.name },
    {
      header: t('settings.api.columns.key'),
      className: 'truncate',
      cell: (token) => token.accessToken,
    },
    {
      header: t('settings.api.columns.createdAt'),
      headerClassName: 'w-48 hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (token) => format(new Date(token.createdAt), 'PPpp'),
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (token) =>
        environment ? <ApiRowActions token={token} environmentId={environment.id} /> : null,
    },
  ];

  return (
    <ResourceListPage<AccessToken>
      title={t('settings.api.title', { environment: environment?.name ?? '' })}
      actions={<NewApiKeyButton onSuccess={refetch} />}
      description={
        <>
          <Alert variant="warning" className="mb-3">
            <WarningIcon className="h-4 w-4" />
            <AlertDescription>
              <Trans
                i18nKey="settings.api.deprecation"
                components={{
                  link: (
                    <Link
                      to={`/project/${project?.id}/settings/personal-api-keys`}
                      className="font-medium underline"
                    />
                  ),
                }}
              />
            </AlertDescription>
          </Alert>
          {t('settings.api.headerBody')}
          <br />
          <Trans
            i18nKey="settings.api.headerEnvironment"
            values={{ environment: environment?.name ?? '' }}
            components={{ strong: <span className="font-bold text-foreground" /> }}
          />
          <br />
          <a
            href="https://docs.usertour.io/api-reference/introduction"
            className="text-primary"
            target="_blank"
            rel="noreferrer"
          >
            <span>{t('settings.api.headerDocs')}</span>
            <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
          </a>
        </>
      }
      columns={columns}
      rows={accessTokens}
      loading={loading || !environment}
      empty={t('settings.api.empty')}
      getRowKey={(token) => token.id}
    />
  );
};

SettingsApiList.displayName = 'SettingsApiList';
