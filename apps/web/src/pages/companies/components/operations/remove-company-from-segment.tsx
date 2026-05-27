import { CloseIcon } from '@usertour/icons';
import { Button } from '@usertour/button';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkRemoveFromSegmentDialog } from '@/components/segments';
import { Segment } from '@usertour/types';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useTranslation } from 'react-i18next';

interface RemoveFromSegmentProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const RemoveFromSegment = (props: RemoveFromSegmentProps) => {
  const { table, currentSegment } = props;
  const { t } = useTranslation();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);

  const [openDelete, setOpenDelete] = useState(false);
  const [bizCompanyIds, setBizCompanyIds] = useState<string[]>([]);
  // `useRemoveCompaniesFromSegment` (unlike the user counterpart) does
  // not refetch internally, so the consumer still owns the refresh on
  // success.
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
        await refetch();
      }
    },
    [refetch],
  );

  return (
    <>
      <Button variant="ghost" className="h-8 px-2" onClick={handleOnClick}>
        <CloseIcon className="mr-1 h-4 w-4" />
        {t('companies.actions.removeFromSegment')}
      </Button>

      <BulkRemoveFromSegmentDialog
        entity="company"
        open={openDelete}
        ids={bizCompanyIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

RemoveFromSegment.displayName = 'RemoveFromSegment';
