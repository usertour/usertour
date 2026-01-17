import { LauncherCreateForm } from '../shared/launcher-create-form';
import { ContentListLayout } from './content-list-layout';

export const LauncherListContent = () => {
  return (
    <ContentListLayout
      title="Launchers"
      description="Launchers work well for: Highlighting key features with hotspots, Showing helpful tips with tooltips."
      emptyTitle="No launchers added"
      emptyDescription="You have not added any launchers. Add one below."
      createButtonText="Create Launcher"
      createForm={({ isOpen, onClose }) => <LauncherCreateForm isOpen={isOpen} onClose={onClose} />}
    />
  );
};

LauncherListContent.displayName = 'LauncherListContent';
