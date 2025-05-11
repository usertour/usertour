import { SettingsContent } from '../components/content';
import { ProjectNameForm } from './components/project-name-form';

export const SettingsProjectsDetail = () => {
  return (
    <div className="flex flex-col grow space-y-8 py-8">
      <SettingsContent className="min-w-[750px] max-w-3xl  shadow-sm border border-border rounded mx-auto bg-background">
        <ProjectNameForm />
      </SettingsContent>
    </div>
  );
};

SettingsProjectsDetail.displayName = 'SettingsProjectsDetail';
