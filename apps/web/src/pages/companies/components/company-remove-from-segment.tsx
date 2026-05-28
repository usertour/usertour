import { CloseIcon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkRemoveFromSegmentDialog } from '@/components/segments';
import { Segment } from '@usertour/types';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useTranslation } from 'react-i18next';

interface RemoveFromSegmentProps {
  table: Table<any>;
  currentSegment: Segment;
  refetch: () => Promise<unknown>;
}

export const CompanyRemoveFromSegment = (props: RemoveFromSegmentProps) => {
  const { table, currentSegment, refetch } = props;
  const { t } = useTranslation();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);

  const [openDelete, setOpenDelete] = useState(false);
  const [bizCompanyIds, setBizCompanyIds] = useState<string[]>([]);

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

CompanyRemoveFromSegment.displayName = 'CompanyRemoveFromSegment';
