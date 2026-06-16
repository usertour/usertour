import { useCallback, useMemo } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { PlusIcon } from '@usertour/icons';
import { Table } from '@tanstack/react-table';
import type { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useTableSelection } from '@/hooks/use-table-selection';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useSegmentListQuery } from '@usertour/hooks';
import type { EntityConfig } from './entity-config';

interface EntityAddToManualSegmentProps {
  config: EntityConfig<any>;
  table: Table<any>;
}

/**
 * Push selected rows into one of the env's MANUAL segments for this
 * entity. Shares the page's segmentList cache slice via
 * SHARED_CACHE_QUERY_OPTIONS so a refetch from any segment-mutation
 * elsewhere on the page (save filter → create segment, rename, etc.)
 * lands in this dropdown without a page refresh.
 */
export const EntityAddToManualSegment = (props: EntityAddToManualSegmentProps) => {
  const { config, table } = props;
  const { t } = useTranslation();
  const { environment } = useAppContext();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const { segmentList } = useSegmentListQuery(environment?.id ?? '', config.segmentBizType, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    skip: !environment?.id,
  });
  const manualSegments = useMemo(
    () => segmentList?.filter((seg) => seg.dataType === 'MANUAL') ?? [],
    [segmentList],
  );
  const { add, isAdding } = config.useAddToManualSegment();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      if (!hasSelection()) {
        return;
      }
      // useAddToManualSegment's mutation carries refetchQueries for the entity
      // list, so the table refreshes without a manual refetch here.
      await add(collectSelectedIds(), segment);
    },
    [collectSelectedIds, hasSelection, add],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-2" disabled={isAdding}>
          <PlusIcon className="mr-1 h-4 w-4" />
          {t(config.i18n.addToManualSegment)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {manualSegments.map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            className="cursor-pointer min-w-[180px]"
            disabled={isAdding}
            onSelect={() => handleAddManualSegment(segment)}
          >
            {segment.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

EntityAddToManualSegment.displayName = 'EntityAddToManualSegment';
