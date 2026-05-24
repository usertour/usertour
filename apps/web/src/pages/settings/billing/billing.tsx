import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { SettingsPage } from '@usertour/ui';
import Pricing from './components/pricing';

export const SettingsBilling = () => {
  const { project } = useAppContext();
  const { t } = useTranslation();
  if (!project || !project.id) {
    return <></>;
  }

  return (
    <SettingsPage title={t('settings.billing.title')}>
      <Pricing projectId={project.id} />
    </SettingsPage>
  );
};

SettingsBilling.displayName = 'SettingsBilling';
