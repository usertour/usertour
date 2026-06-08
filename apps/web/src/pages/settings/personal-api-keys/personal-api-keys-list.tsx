import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { Badge, NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { type ApiToken, useListApiTokensQuery } from '@usertour/hooks';
import { useAppContext } from '@/contexts/app-context';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { CreateDialog } from './components/create-dialog';
import { RowActions } from './components/row-actions';
import { API_TOKEN_SCOPE_OPTIONS, getScopeLabelKey } from './components/scopes';

const NewKeyButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        label={t('settings.personalApiKeys.newButton')}
      />
      <CreateDialog open={open} onOpenChange={setOpen} onSubmit={onSuccess} />
    </>
  );
};

export const PersonalApiKeysList = () => {
  const { projects } = useAppContext();
  // Skipping `isRefetching` here on purpose — Apollo's `loading` flag stays
  // false for refetches, so the table updates in place instead of flashing
  // back to the skeleton when a token is created/revoked.
  const { apiTokens, loading, refetch } = useListApiTokensQuery(SHARED_CACHE_QUERY_OPTIONS);
  const { t } = useTranslation();

  const projectNameById = useMemo(() => {
    const index: Record<string, string> = {};
    for (const project of projects) {
      if (project.id) {
        index[project.id] = project.name ?? project.id;
      }
    }
    return index;
  }, [projects]);

  // Scope value -> label. Unknown scopes fall back to their raw value below.
  const scopeLabelByValue = useMemo(() => {
    const index: Record<string, string> = {};
    for (const scope of API_TOKEN_SCOPE_OPTIONS) {
      index[scope.value] = t(scope.labelKey);
    }
    return index;
  }, [t]);

  const columns: ResourceTableColumn<ApiToken>[] = [
    {
      header: t('settings.personalApiKeys.columns.name'),
      className: 'truncate',
      cell: (token) => token.name,
    },
    {
      header: t('settings.personalApiKeys.columns.key'),
      className: 'truncate',
      // Full key isn't retrievable; show the masked tail only.
      cell: (token) => <span className="text-muted-foreground">utp_···{token.partialKey}</span>,
    },
    {
      header: t('settings.personalApiKeys.columns.projects'),
      cell: (token) => (
        <div className="flex flex-wrap gap-1">
          {token.projectIds.map((id) => (
            <Badge key={id} variant="secondary">
              {projectNameById[id] ?? id}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: t('settings.personalApiKeys.columns.scopes'),
      cell: (token) => (
        <div className="flex flex-wrap gap-1">
          {token.scopes.map((scope) => (
            <Badge key={scope} variant="secondary">
              {scopeLabelByValue[scope] ??
                (getScopeLabelKey(scope) ? t(getScopeLabelKey(scope) as string) : scope)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: t('settings.personalApiKeys.columns.status'),
      headerClassName: 'w-28',
      cell: (token) =>
        token.isActive ? (
          <Badge variant="success">{t('settings.personalApiKeys.statusActive')}</Badge>
        ) : (
          <Badge variant="secondary">{t('settings.personalApiKeys.statusRevoked')}</Badge>
        ),
    },
    {
      header: t('settings.personalApiKeys.columns.createdAt'),
      headerClassName: 'w-48 hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (token) => format(new Date(token.createdAt), 'PPpp'),
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (token) => <RowActions token={token} />,
    },
  ];

  return (
    <ResourceListPage<ApiToken>
      title={t('settings.personalApiKeys.title')}
      actions={<NewKeyButton onSuccess={refetch} />}
      description={
        <>
          {t('settings.personalApiKeys.description')}
          <br />
          <Trans
            i18nKey="settings.personalApiKeys.descriptionOnce"
            components={{ strong: <span className="font-bold text-foreground" /> }}
          />
          <br />
          <a
            href="https://docs.usertour.io/api-reference/introduction"
            className="text-primary"
            target="_blank"
            rel="noreferrer"
          >
            <span>{t('settings.personalApiKeys.headerDocs')}</span>
            <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
          </a>
        </>
      }
      columns={columns}
      rows={apiTokens}
      loading={loading}
      empty={t('settings.personalApiKeys.empty')}
      getRowKey={(token) => token.id}
    />
  );
};

PersonalApiKeysList.displayName = 'PersonalApiKeysList';
