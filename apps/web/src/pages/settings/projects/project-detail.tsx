import { SettingsCard, SettingsCardStack } from '@usertour/ui';
import { ProjectNameForm } from './components/project-name-form';

export const SettingsProjectsDetail = () => {
  return (
    <SettingsCardStack>
      <SettingsCard>
        <ProjectNameForm />
      </SettingsCard>
    </SettingsCardStack>
  );
};

SettingsProjectsDetail.displayName = 'SettingsProjectsDetail';
