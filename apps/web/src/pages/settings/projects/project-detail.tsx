import { SettingsCard, SettingsCardStack } from '@usertour/ui';
import { ProjectGeneralForm } from './components/project-general-form';

export const SettingsProjectDetail = () => {
  return (
    <SettingsCardStack>
      <SettingsCard>
        <ProjectGeneralForm />
      </SettingsCard>
    </SettingsCardStack>
  );
};

SettingsProjectDetail.displayName = 'SettingsProjectDetail';
