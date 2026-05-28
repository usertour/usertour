import { useTranslation } from 'react-i18next';
import { SegmentSidebar } from '@/components/segments/layout';
import { SegmentCreateDialog } from '@/components/segments';
import { useAppContext } from '@/contexts/app-context';
import type { Segment } from '@usertour/types';
import { useState } from 'react';

interface UserListSidebarProps {
  environmentId: string;
  segmentList: Segment[];
  currentSegment: Segment | undefined;
  loading: boolean;
  refetchSegments: () => Promise<unknown>;
}

export const UserListSidebar = (props: UserListSidebarProps) => {
  const { environmentId, segmentList, currentSegment, loading, refetchSegments } = props;
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <SegmentSidebar
        title="Users"
        segmentList={segmentList}
        currentSegment={currentSegment}
        loading={loading}
        onCreate={() => setDialogOpen(true)}
        createTooltip={t('users.segments.tooltips.createSegment')}
        disabled={isViewOnly}
      />
      <SegmentCreateDialog
        entity="user"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={() => refetchSegments()}
        environmentId={environmentId}
      />
    </>
  );
};

UserListSidebar.displayName = 'UserListSidebar';
