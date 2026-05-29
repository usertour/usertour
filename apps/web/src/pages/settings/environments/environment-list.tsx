import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { CopyIcon } from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  QuestionTooltip,
  NewItemButton,
  ResourceListPage,
  type ResourceTableColumn,
} from '@usertour/ui';
import { Environment } from '@usertour/types';
import { EnvironmentCreateDialog } from './components/environment-create-dialog';
import { EnvironmentRowActions } from './components/environment-row-actions';

const ENVIRONMENTS_DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

const NewEnvironmentButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        className="flex-none"
        disabled={isViewOnly}
        label={t('settings.environments.newButton')}
      />
      <EnvironmentCreateDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

const EnvironmentTokenCell = ({ token }: { token: string }) => {
  const copyWithToast = useCopyWithToast();
  return (
    <div className="group flex flex-row items-center space-x-1">
      <span>{token}</span>
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 rounded invisible group-hover:visible"
        onClick={() => copyWithToast(token)}
      >
        <CopyIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const SettingsEnvironmentList = () => {
  const { project } = useAppContext();
  // Skipping `isRefetching` here on purpose — Apollo's `loading` flag stays
  // false for refetches, so the table updates in place instead of flashing
  // back to the skeleton when a row is added/edited/deleted.
  const { environmentList, loading, refetch } = useGetUserEnvironmentsQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();
  const environmentCount = environmentList?.length ?? 0;

  const columns: ResourceTableColumn<Environment>[] = [
    {
      header: t('settings.environments.columns.name'),
      cell: (environment) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{environment.name}</span>
          {environment.isPrimary ? (
            <Badge variant="success">{t('settings.environments.primaryBadge')}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      header: (
        <>
          {t('settings.environments.columns.token')}
          <QuestionTooltip className="inline ml-1 mb-1">
            {t('settings.environments.tokenTooltip')}
          </QuestionTooltip>
        </>
      ),
      cell: (environment) => <EnvironmentTokenCell token={environment.token} />,
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (environment) => (
        <EnvironmentRowActions environment={environment} environmentCount={environmentCount} />
      ),
    },
  ];

  return (
    <ResourceListPage<Environment>
      title={t('settings.environments.title')}
      actions={<NewEnvironmentButton onSuccess={refetch} />}
      description={<p>{t('settings.environments.description')}</p>}
      docs={{
        href: ENVIRONMENTS_DOCS_HREF,
        label: t('settings.common.readGuide', { topic: t('settings.environments.title') }),
      }}
      columns={columns}
      rows={environmentList ?? undefined}
      loading={loading}
      empty={t('settings.environments.empty')}
      getRowKey={(environment) => environment.id}
    />
  );
};

SettingsEnvironmentList.displayName = 'SettingsEnvironmentList';
