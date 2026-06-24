import { Delete2Icon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkDeleteFromSegmentDialog } from '..';
import { useTranslation } from 'react-i18next';
import { useTableSelection } from '@/hooks/use-table-selection';
import type { EntityConfig } from './entity-config';

interface EntityDeleteFromSegmentProps {
  config: EntityConfig<any>;
  table: Table<any>;
  refetch: () => Promise<unknown>;
}

export const EntityDeleteFromSegment = (props: EntityDeleteFromSegmentProps) => {
  const { config, table, refetch } = props;
  const { t } = useTranslation();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);

  const [openDelete, setOpenDelete] = useState(false);
  const [bizIds, setBizIds] = useState<string[]>([]);

  const handleOnClick = useCallback(() => {
    if (hasSelection()) {
      setBizIds(collectSelectedIds());
      setOpenDelete(true);
    }
  }, [collectSelectedIds, hasSelection]);

  const handleSubmit = useCallback(
    async (success: boolean) => {
      if (success) {
        await refetch();
        // Clear the now-deleted ids out of the selection state so it doesn't
        // linger across refetches.
        table.resetRowSelection();
      }
    },
    [refetch, table],
  );

  return (
    <>
      <Button
        variant="ghost"
        className="h-8 px-2 hover:text-red-600 hover:bg-red-100"
        onClick={handleOnClick}
      >
        <Delete2Icon className="mr-1 h-4 w-4" />
        {t(config.i18n.deleteAction)}
      </Button>
      <BulkDeleteFromSegmentDialog
        entity={config.kind}
        open={openDelete}
        ids={bizIds}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

EntityDeleteFromSegment.displayName = 'EntityDeleteFromSegment';
