import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-packages/button';
import { Delete2Icon } from '@usertour-packages/icons';
import { BizCompanyDeleteForm } from '../dialogs';
import { useCallback } from 'react';
import { useState } from 'react';
import { useCompanyListContext } from '@/contexts/company-list-context';

interface DeleteCompanyFromSegmentProps {
  table: Table<any>;
}

export const DeleteCompanyFromSegment = (props: DeleteCompanyFromSegmentProps) => {
  const { table } = props;

  const [openDelete, setOpenDelete] = useState(false);
  const [bizCompanyIds, setBizCompanyIds] = useState<string[]>([]);
  const { refetch } = useCompanyListContext();

  const handleOnClick = useCallback(() => {
    const rows = table.getFilteredSelectedRowModel().rows;
    const ids = [];
    for (const row of rows) {
      ids.push(row.getValue('id'));
    }
    if (ids.length > 0) {
      setBizCompanyIds(ids);
      setOpenDelete(true);
    }
  }, [table]);

  const handleSubmit = useCallback(
    async (success: boolean) => {
      if (success) {
        setOpenDelete(false);
        await refetch();
      }
    },
    [refetch],
  );

  return (
    <>
      {' '}
      <Button
        variant={'ghost'}
        className="h-8 text-primary hover:text-primary px-1 text-red-600 hover:text-red-600 hover:bg-red-100"
        onClick={handleOnClick}
      >
        <Delete2Icon className="mr-1" />
        Delete company
      </Button>
      <BizCompanyDeleteForm
        open={openDelete}
        bizCompanyIds={bizCompanyIds}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

DeleteCompanyFromSegment.displayName = 'DeleteCompanyFromSegment';
