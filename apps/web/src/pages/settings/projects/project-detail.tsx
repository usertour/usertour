import { SettingsCard, SettingsCardStack } from '@usertour/ui';
import { ProjectNameForm } from './components/project-name-form';

export const SettingsProjectDetail = () => {
  return (
    <SettingsCardStack>
      <SettingsCard>
        <ProjectNameForm />
      </SettingsCard>
    </SettingsCardStack>
  );
};

SettingsProjectDetail.displayName = 'SettingsProjectDetail';
