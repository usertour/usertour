import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';

export const IntegrationListHeader = () => {
  const { environment } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="relative">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between">
          <h3 className="text-xl font-medium tracking-tight">
            {t('settings.integrations.title', { environment: environment?.name ?? '' })}
          </h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('settings.integrations.headerBody')} <br />
          {t('settings.integrations.headerEnvironmentNote', { environment: environment?.name })}{' '}
          <br />
          <a
            href="https://docs.usertour.io/api-reference/introduction"
            className="text-primary"
            target="_blank"
            rel="noreferrer"
          >
            <span>{t('settings.integrations.headerDocs')}</span>
            <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
