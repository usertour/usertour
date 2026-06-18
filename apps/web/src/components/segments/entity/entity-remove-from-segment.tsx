import { CloseIcon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { Table } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { BulkRemoveFromSegmentDialog } from '..';
import type { Segment } from '@usertour/types';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useTranslation } from 'react-i18next';
import type { EntityConfig } from './entity-config';

interface EntityRemoveFromSegmentProps {
  config: EntityConfig<any>;
  table: Table<any>;
  currentSegment: Segment;
}

export const EntityRemoveFromSegment = (props: EntityRemoveFromSegmentProps) => {
  const { config, table, currentSegment } = props;
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

  // The remove-from-segment mutation carries refetchQueries for the entity
  // list, so the table refreshes without an onSubmit refetch here.
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
      />
    </>
  );
};

EntityRemoveFromSegment.displayName = 'EntityRemoveFromSegment';
