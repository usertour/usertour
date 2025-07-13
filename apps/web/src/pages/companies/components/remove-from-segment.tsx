import { CloseIcon } from '@usertour-ui/icons';
import { Button } from '@usertour-ui/button';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BizCompanyRemoveForm } from './company-remove-form';
import { Segment } from '@usertour-ui/types';

interface RemoveFromSegmentProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const RemoveFromSegment = (props: RemoveFromSegmentProps) => {
  const { table, currentSegment } = props;

  const [openDelete, setOpenDelete] = useState(false);
  const [bizCompanyIds, setBizCompanyIds] = useState<string[]>([]);

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
  }, [table, bizCompanyIds]);

  return (
    <>
      <Button
        variant={'ghost'}
        className="h-8 text-primary hover:text-primary px-1"
        onClick={handleOnClick}
      >
        <CloseIcon className="mr-1" />
        Remove from this segment
      </Button>

      <BizCompanyRemoveForm
        open={openDelete}
        bizCompanyIds={bizCompanyIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          setOpenDelete(false);
          // onSubmit("delete");
        }}
      />
    </>
  );
};

RemoveFromSegment.displayName = 'RemoveFromSegment';
