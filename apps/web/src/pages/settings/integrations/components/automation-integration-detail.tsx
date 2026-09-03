import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { IntegrationCatalogEntry } from '@usertour/constants';
import { RiExternalLinkLine } from '@usertour/icons';
import { Button, SettingsCard, SettingsCardStack } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { ExternalLink } from '@/components/external-link';

const ZAPIER_DOCS_HREF = 'https://docs.usertour.io/integrations/zapier';

export interface AutomationIntegrationDetailProps {
  entry: IntegrationCatalogEntry;
  entitled: boolean;
}

/**
 * Detail page for a link-out provider: nothing to configure or observe on
 * this side, so the page explains the handshake, sends the user to the
 * provider, and says what the provider leaves behind here (Zap triggers are
 * ordinary webhooks, managed on the Webhooks page).
 */
export const AutomationIntegrationDetail = (props: AutomationIntegrationDetailProps) => {
  const { entry, entitled } = props;
  const { project } = useAppContext();
  const { t } = useTranslation();

  return (
    <SettingsCardStack>
      <SettingsCard>
        {!entitled && (
          <div className="mb-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {t('settings.integrations.downgraded.banner')}
          </div>
        )}
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                className="h-12 w-12 rounded-lg border border-accent-light object-cover"
                src={entry.imagePath}
                alt={t('settings.integrations.catalog.logoAlt', { name: entry.name })}
              />
              <h3 className="text-xl font-medium tracking-tight">{entry.name}</h3>
            </div>
            {entry.externalUrl && (
              <Button asChild>
                <a href={entry.externalUrl} target="_blank" rel="noreferrer">
                  {t('settings.integrations.zapier.open')}
                  <RiExternalLinkLine className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t('settings.integrations.zapier.intro')}</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t('settings.integrations.zapier.step1')}</li>
            <li>{t('settings.integrations.zapier.step2')}</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            {t('settings.integrations.zapier.webhooksNote')}{' '}
            <Link
              to={`/project/${project?.id}/settings/webhooks`}
              className="text-primary hover:underline"
            >
              {t('settings.integrations.zapier.webhooksLink')}
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            <ExternalLink href={ZAPIER_DOCS_HREF}>
              {t('settings.integrations.zapier.docs')}
            </ExternalLink>
          </p>
        </div>
      </SettingsCard>
    </SettingsCardStack>
  );
};

AutomationIntegrationDetail.displayName = 'AutomationIntegrationDetail';
