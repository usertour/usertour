import { Delete2Icon } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BizUserDeleteDialog } from '../dialogs';
import { useUserListContext } from '@/contexts/user-list-context';
import { useTranslation } from 'react-i18next';
import { useTableSelection } from '@/hooks/use-table-selection';

interface DeleteUserFromSegmentProps {
  table: Table<any>;
}

export const DeleteUserFromSegment = (props: DeleteUserFromSegmentProps) => {
  const { table } = props;
  const { collectSelectedIds, hasSelection } = useTableSelection(table);

  const [openDelete, setOpenDelete] = useState(false);
  const [bizUserIds, setBizUserIds] = useState<string[]>([]);
  const { refetch } = useUserListContext();
  const { t } = useTranslation();

  const handleOnClick = useCallback(() => {
    if (hasSelection()) {
      const ids = collectSelectedIds();
      setBizUserIds(ids);
      setOpenDelete(true);
    }
  }, [collectSelectedIds, hasSelection]);

  return (
    <>
      <Button
        variant={'ghost'}
        className="h-8 text-primary hover:text-primary px-1 text-red-600 hover:text-red-600 hover:bg-red-100"
        onClick={handleOnClick}
      >
        <Delete2Icon className="mr-1" />
        {t('users.actions.deleteUser')}
      </Button>
      <BizUserDeleteDialog
        open={openDelete}
        bizUserIds={bizUserIds}
        onOpenChange={setOpenDelete}
        onSuccess={async () => {
          setOpenDelete(false);
          await refetch(); // Additional data refresh logic
        }}
      />
    </>
  );
};

DeleteUserFromSegment.displayName = 'DeleteUserFromSegment';
