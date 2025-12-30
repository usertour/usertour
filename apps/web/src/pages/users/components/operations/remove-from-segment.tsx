import { CloseIcon } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BizUserRemoveDialog } from '../dialogs';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';

interface RemoveFromSegmentProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const RemoveFromSegment = (props: RemoveFromSegmentProps) => {
  const { table, currentSegment } = props;

  const [openDelete, setOpenDelete] = useState(false);
  const [bizUserIds, setBizUserIds] = useState<string[]>([]);
  const { t } = useTranslation();

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
        className="h-8 text-primary hover:text-primary px-1"
        onClick={handleOnClick}
      >
        <CloseIcon className="mr-1" />
        {t('users.actions.removeFromSegment')}
      </Button>

      <BizUserRemoveDialog
        open={openDelete}
        bizUserIds={bizUserIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          setOpenDelete(false);
        }}
      />
    </>
  );
};

RemoveFromSegment.displayName = 'RemoveFromSegment';
