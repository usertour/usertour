import { useAppContext } from '@/contexts/app-context';
import { SettingsContent } from '../components/content';
import SubscriptionPlan from './components/subscription-plan';
import { SettingsSubscriptionHeader } from './components/subscription-header';
import { Separator } from '@usertour-packages/separator';

export const SettingsSubscription = () => {
  const { project } = useAppContext();
  if (!project || !project.id) {
    return <></>;
  }

  return (
    <SettingsContent>
      <SettingsSubscriptionHeader />
      <Separator />
      <SubscriptionPlan projectId={project.id} />
    </SettingsContent>
  );
};

SettingsSubscription.displayName = 'SettingsSubscription';
