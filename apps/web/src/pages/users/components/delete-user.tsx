import { Delete2Icon } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BizUserDeleteForm } from './forms';
import { useUserListContext } from '@/contexts/user-list-context';

interface DeleteUserFromSegmentProps {
  table: Table<any>;
}

export const DeleteUserFromSegment = (props: DeleteUserFromSegmentProps) => {
  const { table } = props;
  const [openDelete, setOpenDelete] = useState(false);
  const [bizUserIds, setBizUserIds] = useState<string[]>([]);
  const { refetch } = useUserListContext();

  const handleOnClick = useCallback(() => {
    const rows = table.getFilteredSelectedRowModel().rows;
    const ids = [];
    for (const row of rows) {
      ids.push(row.original.id);
    }
    if (ids.length > 0) {
      setBizUserIds(ids);
      setOpenDelete(true);
    }
  }, [table]);
  return (
    <>
      <Button
        variant={'ghost'}
        className="h-8 text-primary hover:text-primary px-1 text-red-600 hover:text-red-600 hover:bg-red-100"
        onClick={handleOnClick}
      >
        <Delete2Icon className="mr-1" />
        Delete user
      </Button>
      <BizUserDeleteForm
        open={openDelete}
        bizUserIds={bizUserIds}
        onOpenChange={setOpenDelete}
        onSubmit={async () => {
          setOpenDelete(false);
          await refetch();
        }}
      />
    </>
  );
};

DeleteUserFromSegment.displayName = 'DeleteUserFromSegment';
