import { Delete2Icon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkDeleteFromSegmentDialog } from '@/components/segments';
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

  const handleSubmit = useCallback(
    async (success: boolean) => {
      if (success) {
        await refetch();
      }
    },
    [refetch],
  );

  return (
    <>
      <Button
        variant="ghost"
        className="h-8 px-2 hover:text-red-600 hover:bg-red-100"
        onClick={handleOnClick}
      >
        <Delete2Icon className="mr-1 h-4 w-4" />
        {t('users.actions.deleteUser')}
      </Button>
      <BulkDeleteFromSegmentDialog
        entity="user"
        open={openDelete}
        ids={bizUserIds}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

DeleteUserFromSegment.displayName = 'DeleteUserFromSegment';
