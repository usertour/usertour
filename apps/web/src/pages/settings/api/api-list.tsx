import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour/button';
import { format } from 'date-fns';
import { RiAddLine } from '@usertour/icons';
import { ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { ApiProvider, useApiContext } from '@/contexts/api-context';
import type { AccessToken } from '@usertour/hooks';
import { ApiCreateDialog } from './components/api-create-dialog';
import { ApiRowActions } from './components/api-row-actions';

const NewApiKeyButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <RiAddLine className="mr-2 h-4 w-4" />
        {t('settings.api.newButton')}
      </Button>
      <ApiCreateDialog
        visible={open}
        onClose={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

const ApiListPage = () => {
  const { accessTokens, loading, isRefetching, refetch } = useApiContext();
  const { environment } = useAppContext();
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
          {t('settings.api.headerBody')}
          <br />
          <Trans
            i18nKey="settings.api.headerEnvironmentNote"
            values={{ environment: environment?.name ?? '' }}
            components={{ strong: <span className="font-bold text-foreground" /> }}
          />{' '}
          <br />
          {t('settings.api.headerEnvironmentSwitch')}
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
      loading={loading || isRefetching || !environment}
      empty={t('settings.api.empty')}
      getRowKey={(token) => token.id}
    />
  );
};

export const SettingsApiList = () => {
  return (
    <ApiProvider>
      <ApiListPage />
    </ApiProvider>
  );
};

SettingsApiList.displayName = 'SettingsApiList';
