import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useListLocalizationsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { Badge, NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { Localization } from '@usertour/types';
import { format } from 'date-fns';
import { LocalizationCreateDialog } from './components/localization-create-dialog';
import { LocalizationRowActions } from './components/localization-row-actions';

const LOCALIZATION_DOCS_HREF =
  'https://docs.usertour.io/building-experiences/creating-your-first-flow/';

const NewLocalizationButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        className="flex-none"
        label={t('settings.localizations.newButton')}
      />
      <LocalizationCreateDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

export const SettingsLocalizationList = () => {
  const { project } = useAppContext();
  const { localizationList, loading, refetch } = useListLocalizationsQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();

  const columns: ResourceTableColumn<Localization>[] = [
    { header: t('settings.localizations.columns.code'), cell: (item) => item.code },
    {
      header: t('settings.localizations.columns.name'),
      cell: (item) => (
        <>
          {item.name}{' '}
          {item.isDefault ? (
            <Badge variant="success">{t('settings.localizations.defaultBadge')}</Badge>
          ) : null}
        </>
      ),
    },
    {
      header: t('settings.localizations.columns.createdAt'),
      cell: (item) => format(new Date(item.createdAt), 'PPpp'),
    },
    {
      header: '',
      cell: (item) => <LocalizationRowActions localization={item} />,
    },
  ];

  return (
    <ResourceListPage<Localization>
      title={t('settings.localizations.title')}
      actions={<NewLocalizationButton onSuccess={refetch} />}
      description={
        <p>
          {t('settings.localizations.description')}{' '}
          <Trans
            i18nKey="settings.localizations.descriptionContinuation"
            components={{ code: <b /> }}
          />
        </p>
      }
      docs={{
        href: LOCALIZATION_DOCS_HREF,
        label: t('settings.common.readGuide', { topic: t('settings.localizations.title') }),
      }}
      columns={columns}
      rows={localizationList}
      loading={loading}
      empty={t('settings.localizations.empty')}
      getRowKey={(item) => item.id}
    />
  );
};

SettingsLocalizationList.displayName = 'SettingsLocalizationList';
