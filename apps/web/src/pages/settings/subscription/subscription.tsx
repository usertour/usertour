import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { SettingsPage } from '@usertour/ui';
import SubscriptionPlan from './components/subscription-plan';

export const SettingsSubscription = () => {
  const { project } = useAppContext();
  const { t } = useTranslation();
  if (!project || !project.id) {
    return <></>;
  }

  return (
    <SettingsPage title={t('settings.subscription.title')}>
      <SubscriptionPlan projectId={project.id} />
    </SettingsPage>
  );
};

SettingsSubscription.displayName = 'SettingsSubscription';
