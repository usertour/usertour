import { Group2LineIcon } from '@usertour/icons';
import { SegmentSidebar } from '@/components/segments/layout';
import { SegmentCreateDialog } from '@/components/segments';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import type { Segment } from '@usertour/types';
import { useState } from 'react';

interface CompanyListSidebarProps {
  environmentId: string;
  segmentList: Segment[];
  currentSegment: Segment | undefined;
  loading: boolean;
  refetchSegments: () => Promise<unknown>;
}

export const CompanyListSidebar = (props: CompanyListSidebarProps) => {
  const { environmentId, segmentList, currentSegment, loading, refetchSegments } = props;
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <SegmentSidebar
        title="Companies"
        segmentList={segmentList}
        currentSegment={currentSegment}
        loading={loading}
        groupIcon={<Group2LineIcon width={16} height={16} className="mr-1" />}
        onCreate={() => setDialogOpen(true)}
        createTooltip={t('companies.segments.tooltips.createSegment')}
        disabled={isViewOnly}
      />
      <SegmentCreateDialog
        entity="company"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={() => refetchSegments()}
        environmentId={environmentId}
      />
    </>
  );
};

CompanyListSidebar.displayName = 'CompanyListSidebar';
