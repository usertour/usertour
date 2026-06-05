import { Button } from '@usertour/ui';
import { RiAddCircleLine } from '@usertour/icons';
import { StepContentType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';

// "Add step" goes straight into the step-detail view for a new step
// (defaulting to a modal). The step type is chosen there via the type grid,
// which is more direct than a separate type-picker popover.
export const SidebarCreate = () => {
  const { t } = useTranslation();
  const { startCreateStep } = useFlowEditor();

  return (
    <Button
      variant="ghost"
      onClick={() => startCreateStep(StepContentType.MODAL)}
      className="h-9 w-full rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary hover:bg-accent/50 hover:text-primary"
    >
      <RiAddCircleLine className="mr-2 size-4 opacity-70" />
      {t('contentBuilder.flow.addStep')}
    </Button>
  );
};

SidebarCreate.displayName = 'SidebarCreate';
