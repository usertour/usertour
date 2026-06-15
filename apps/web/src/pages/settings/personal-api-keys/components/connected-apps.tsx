import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  ResourceListPage,
  type ResourceTableColumn,
} from '@usertour/ui';
import {
  type OAuthConnection,
  useOAuthConnectionsQuery,
  useRevokeOAuthConnectionMutation,
} from '@usertour/hooks';
import { format, formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

import { summarizeScopes } from './scopes';

const RevokeButton = ({ id, name, onDone }: { id: string; name: string; onDone: () => void }) => {
  const { t } = useTranslation();
  const { revoke, loading } = useRevokeOAuthConnectionMutation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          {t('settings.connectedApps.revoke')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.connectedApps.revokeTitle', { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings.connectedApps.revokeDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async () => {
              await revoke(id);
              onDone();
            }}
          >
            {t('settings.connectedApps.revoke')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Account-level "Connected apps": OAuth grants (MCP connectors) the user has
 * authorized. Each shows the app, the project it can act in, the access granted,
 * and a Revoke that kills its tokens immediately.
 */
export const ConnectedApps = () => {
  const { t } = useTranslation();
  const { connections, loading, refetch } = useOAuthConnectionsQuery(SHARED_CACHE_QUERY_OPTIONS);

  const columns: ResourceTableColumn<OAuthConnection>[] = [
    {
      header: t('settings.connectedApps.columns.app'),
      className: 'truncate font-medium',
      cell: (c) => c.clientName,
    },
    {
      header: t('settings.connectedApps.columns.project'),
      cell: (c) => c.projectName,
    },
    {
      header: t('settings.connectedApps.columns.access'),
      cell: (c) => (
        <div className="flex flex-wrap gap-1">
          {summarizeScopes(c.scopes).map((s) => (
            <Badge key={s.key} variant="secondary" className="font-normal">
              {t(s.labelKey)}: {t(`settings.personalApiKeys.scopeLevels.${s.level}`)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: t('settings.connectedApps.columns.lastUsed'),
      headerClassName: 'w-36',
      cell: (c) =>
        c.lastUsedAt ? (
          formatDistanceToNow(new Date(c.lastUsedAt), { addSuffix: true })
        ) : (
          <span className="text-muted-foreground">{t('settings.connectedApps.never')}</span>
        ),
    },
    {
      header: t('settings.connectedApps.columns.authorized'),
      headerClassName: 'w-48 hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (c) => format(new Date(c.createdAt), 'PPpp'),
    },
    {
      header: '',
      headerClassName: 'w-24',
      cell: (c) => <RevokeButton id={c.id} name={c.clientName} onDone={refetch} />,
    },
  ];

  return (
    <ResourceListPage<OAuthConnection>
      title={t('settings.connectedApps.title')}
      description={t('settings.connectedApps.description')}
      columns={columns}
      rows={connections}
      loading={loading}
      empty={t('settings.connectedApps.empty')}
      getRowKey={(c) => c.id}
    />
  );
};

ConnectedApps.displayName = 'ConnectedApps';
