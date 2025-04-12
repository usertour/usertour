import { useAppContext } from '@/contexts/app-context';
import { SettingsContent } from '../components/content';
import Pricing from './components/pricing';
import { SettingsBillingHeader } from './components/billing-header';
import { Separator } from '@usertour-ui/separator';

export const SettingsBilling = () => {
  const { project } = useAppContext();
  if (!project || !project.id) {
    return <></>;
  }

  return (
    <SettingsContent>
      <SettingsBillingHeader />
      <Separator />
      <Pricing projectId={project.id} />
    </SettingsContent>
  );
};

SettingsBilling.displayName = 'SettingsBilling';
