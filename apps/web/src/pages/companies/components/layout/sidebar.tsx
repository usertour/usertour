import { Group2LineIcon } from '@usertour-packages/icons';
import { SegmentSidebar } from '@/components/molecules/segment/layout';
import { CompanySegmentCreateDialog } from '../dialogs';
import { useAppContext } from '@/contexts/app-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useState } from 'react';

interface CompanyListSidebarProps {
  environmentId?: string;
}

export function CompanyListSidebar({ environmentId }: CompanyListSidebarProps) {
  const { isViewOnly } = useAppContext();
  const { refetch } = useSegmentListContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDialogClose = () => {
    setDialogOpen(false);
    refetch();
  };

  return (
    <>
      <SegmentSidebar
        title="Companies"
        groupIcon={<Group2LineIcon width={16} height={16} className="mr-1" />}
        onCreate={() => setDialogOpen(true)}
        createTooltip="Create company segment"
        disabled={isViewOnly}
      />
      <CompanySegmentCreateDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        environmentId={environmentId}
      />
    </>
  );
}

CompanyListSidebar.displayName = 'CompanyListSidebar';
