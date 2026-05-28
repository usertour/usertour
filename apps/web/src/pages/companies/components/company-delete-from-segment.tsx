import { Table } from '@tanstack/react-table';
import { Button } from '@usertour/ui';
import { Delete2Icon } from '@usertour/icons';
import { BulkDeleteFromSegmentDialog } from '@/components/segments';
import { useCallback, useState } from 'react';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useTranslation } from 'react-i18next';

interface DeleteCompanyFromSegmentProps {
  table: Table<any>;
  refetch: () => Promise<unknown>;
}

export const CompanyDeleteFromSegment = (props: DeleteCompanyFromSegmentProps) => {
  const { table, refetch } = props;
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
      <Button
        variant="ghost"
        className="h-8 px-2 hover:text-red-600 hover:bg-red-100"
        onClick={handleOnClick}
      >
        <Delete2Icon className="mr-1 h-4 w-4" />
        {t('companies.actions.deleteCompany')}
      </Button>
      <BulkDeleteFromSegmentDialog
        entity="company"
        open={openDelete}
        ids={bizCompanyIds}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

CompanyDeleteFromSegment.displayName = 'CompanyDeleteFromSegment';
