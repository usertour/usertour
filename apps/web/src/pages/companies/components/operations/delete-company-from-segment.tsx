import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-packages/button';
import { Delete2Icon } from '@usertour-packages/icons';
import { BizCompanyDeleteForm } from '../dialogs';
import { useCallback } from 'react';
import { useState } from 'react';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { useTableSelection } from '@/hooks/use-table-selection';

interface DeleteCompanyFromSegmentProps {
  table: Table<any>;
}

export const DeleteCompanyFromSegment = (props: DeleteCompanyFromSegmentProps) => {
  const { table } = props;
  const { collectSelectedIds, hasSelection } = useTableSelection(table);

  const [openDelete, setOpenDelete] = useState(false);
  const [bizCompanyIds, setBizCompanyIds] = useState<string[]>([]);
  const { refetch } = useCompanyListContext();

  const handleOnClick = useCallback(() => {
    if (hasSelection()) {
      const ids = collectSelectedIds();
      setBizCompanyIds(ids);
      setOpenDelete(true);
    }
  }, [collectSelectedIds, hasSelection]);

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
