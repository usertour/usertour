import { ChecklistCreateForm } from '../shared/checklist-create-form';
import { ContentListLayout } from './content-list-layout';

export const ChecklistListContent = () => {
  return (
    <ContentListLayout
      title="Checklists"
      description="A checklist helps users feel accomplished, encourages them to engage more with your product, and guides them step-by-step through clear actions."
      emptyTitle="No checklists added"
      emptyDescription="You have not added any checklists. Add one below."
      createButtonText="Create Checklist"
      createForm={({ isOpen, onClose }) => (
        <ChecklistCreateForm isOpen={isOpen} onClose={onClose} />
      )}
    />
  );
};

ChecklistListContent.displayName = 'ChecklistListContent';
