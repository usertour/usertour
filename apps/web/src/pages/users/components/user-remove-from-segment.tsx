import { CloseIcon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkRemoveFromSegmentDialog } from '@/components/segments';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useTableSelection } from '@/hooks/use-table-selection';

interface RemoveFromSegmentProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const UserRemoveFromSegment = (props: RemoveFromSegmentProps) => {
  const { table, currentSegment } = props;
  const { collectSelectedIds, hasSelection } = useTableSelection(table);

  const [openDelete, setOpenDelete] = useState(false);
  const [bizUserIds, setBizUserIds] = useState<string[]>([]);
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
      <Button variant="ghost" className="h-8 px-2" onClick={handleOnClick}>
        <CloseIcon className="mr-1 h-4 w-4" />
        {t('users.actions.removeFromSegment')}
      </Button>

      <BulkRemoveFromSegmentDialog
        entity="user"
        open={openDelete}
        ids={bizUserIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        // `useRemoveUsersFromSegment` handles list refetch internally —
        // no extra work needed in the success branch.
        onSubmit={() => undefined}
      />
    </>
  );
};

UserRemoveFromSegment.displayName = 'UserRemoveFromSegment';
