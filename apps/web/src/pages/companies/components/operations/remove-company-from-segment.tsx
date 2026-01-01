import { CloseIcon } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BizCompanyRemoveDialog } from '../dialogs';
import { Segment } from '@usertour/types';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { useTableSelection } from '@/hooks/use-table-selection';

interface RemoveFromSegmentProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const RemoveFromSegment = (props: RemoveFromSegmentProps) => {
  const { table, currentSegment } = props;
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
      <Button
        variant={'ghost'}
        className="h-8 text-primary hover:text-primary px-1"
        onClick={handleOnClick}
      >
        <CloseIcon className="mr-1" />
        Remove from this segment
      </Button>

      <BizCompanyRemoveDialog
        open={openDelete}
        bizCompanyIds={bizCompanyIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

RemoveFromSegment.displayName = 'RemoveFromSegment';
