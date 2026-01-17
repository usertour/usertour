import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { ContentCreateForm } from '../shared/content-create-form';
import { ContentListLayout } from './content-list-layout';

const FLOW_DOCS_URL = 'https://docs.usertour.io/building-experiences/creating-your-first-flow/';

const FlowDescription = () => (
  <>
    Step-by-step flows with tooltips and pop-up modals. Perfect for: product tours, user guides, and
    announcements. <br />
    <a href={FLOW_DOCS_URL} className="text-primary" target="_blank" rel="noreferrer">
      <span>Read more in our Creating your first flow guide</span>
      <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
    </a>
  </>
);

export const FlowListContent = () => {
  return (
    <ContentListLayout
      title="Flows"
      description={<FlowDescription />}
      emptyTitle="No flows added"
      emptyDescription="You have not added any flows. Add one below."
      createButtonText="Create Flow"
      buttonId="create-flow-button"
      createForm={({ isOpen, onClose }) => <ContentCreateForm isOpen={isOpen} onClose={onClose} />}
    />
  );
};

FlowListContent.displayName = 'FlowListContent';
