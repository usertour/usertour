import { useTranslation } from 'react-i18next';
import { SegmentSidebar } from '@/components/molecules/segment/layout';
import { UserSegmentCreateDialog } from '../dialogs';
import { useAppContext } from '@/contexts/app-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useState } from 'react';

interface UserListSidebarProps {
  environmentId?: string;
}

export const UserListSidebar = ({ environmentId }: UserListSidebarProps) => {
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
        title="Users"
        onCreate={() => setDialogOpen(true)}
        createTooltip={t('users.segments.tooltips.createSegment')}
        disabled={isViewOnly}
      />
      <UserSegmentCreateDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        environmentId={environmentId}
      />
    </>
  );
};

UserListSidebar.displayName = 'UserListSidebar';
