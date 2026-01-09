import { Group2LineIcon } from '@usertour-packages/icons';
import { SegmentSidebar } from '@/components/molecules/segment/layout';
import { CompanySegmentCreateDialog } from '../dialogs';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useState } from 'react';

interface CompanyListSidebarProps {
  environmentId?: string;
}

export const CompanyListSidebar = ({ environmentId }: CompanyListSidebarProps) => {
  const { t } = useTranslation();
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
        createTooltip={t('companies.segments.tooltips.createSegment')}
        disabled={isViewOnly}
      />
      <CompanySegmentCreateDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        environmentId={environmentId}
      />
    </>
  );
};

CompanyListSidebar.displayName = 'CompanyListSidebar';
