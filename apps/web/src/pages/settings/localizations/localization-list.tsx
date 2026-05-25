import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import {
  LocalizationListProvider,
  useLocalizationListContext,
} from '@/contexts/localization-list-context';
import { Badge } from '@usertour/badge';
import { Button } from '@usertour/button';
import { RiAddLine } from '@usertour/icons';
import { Localization } from '@usertour/types';
import { ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
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
      <Button onClick={() => setOpen(true)} className="flex-none">
        <RiAddLine className="mr-2 h-4 w-4" />
        {t('settings.localizations.newButton')}
      </Button>
      <LocalizationCreateDialog
        isOpen={open}
        onClose={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </>
  );
};

const LocalizationsListPage = () => {
  const { localizationList, loading, refetch } = useLocalizationListContext();
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
          Localization enables you to tailor your Usertour content to align with your users'
          language and regional preferences. A locale defines the user's specific language and
          region settings. By including the user's locale through the <b>locale_code</b> attribute
          in your app's Usertour.js setup, you ensure that Usertour delivers content in the
          appropriate language seamlessly.
        </p>
      }
      docs={{
        href: LOCALIZATION_DOCS_HREF,
        label: t('settings.common.readGuide', { topic: t('settings.localizations.title') }),
      }}
      columns={columns}
      rows={localizationList}
      loading={loading}
      getRowKey={(item) => item.id}
    />
  );
};

export const SettingsLocalizationList = () => {
  const { project } = useAppContext();
  return (
    <LocalizationListProvider projectId={project?.id}>
      <LocalizationsListPage />
    </LocalizationListProvider>
  );
};

SettingsLocalizationList.displayName = 'SettingsLocalizationList';
