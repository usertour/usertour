import { Group2LineIcon } from '@usertour/icons';
import { SegmentSidebar } from '@/components/segments/layout';
import { SegmentCreateDialog } from '@/components/segments';
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

  return (
    <>
      <SegmentSidebar
        title="Companies"
        groupIcon={<Group2LineIcon width={16} height={16} className="mr-1" />}
        onCreate={() => setDialogOpen(true)}
        createTooltip={t('companies.segments.tooltips.createSegment')}
        disabled={isViewOnly}
      />
      <SegmentCreateDialog
        entity="company"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={() => refetch()}
        environmentId={environmentId}
      />
    </>
  );
};

CompanyListSidebar.displayName = 'CompanyListSidebar';
