import { CloseIcon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkRemoveFromSegmentDialog } from '@/components/segments';
import type { Segment } from '@usertour/types';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useTranslation } from 'react-i18next';
import type { EntityConfig } from './entity-config';

interface EntityRemoveFromSegmentProps {
  config: EntityConfig<any>;
  table: Table<any>;
  currentSegment: Segment;
  refetch: () => Promise<unknown>;
}

export const EntityRemoveFromSegment = (props: EntityRemoveFromSegmentProps) => {
  const { config, table, currentSegment, refetch } = props;
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
      }
    },
    [refetch],
  );

  return (
    <>
      <Button variant="ghost" className="h-8 px-2" onClick={handleOnClick}>
        <CloseIcon className="mr-1 h-4 w-4" />
        {t(config.i18n.removeFromSegment)}
      </Button>
      <BulkRemoveFromSegmentDialog
        entity={config.kind}
        open={openDelete}
        ids={bizIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        onSubmit={handleSubmit}
      />
    </>
  );
};

EntityRemoveFromSegment.displayName = 'EntityRemoveFromSegment';
