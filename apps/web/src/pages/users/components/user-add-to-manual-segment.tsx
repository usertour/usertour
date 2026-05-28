import { useCallback, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from '@usertour/ui';
import { PlusIcon } from '@usertour/icons';
import { Table } from '@tanstack/react-table';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useSegmentListQuery } from '@usertour/hooks';
import { useAddUsersToSegment } from '@/hooks/use-add-users-to-segment';

const USER_BIZ_TYPE = ['USER'];

interface AddUserManualSegmentProps {
  table: Table<any>;
  refetch: () => Promise<unknown>;
}

/**
 * Lets the user push selected rows into one of the env's MANUAL segments.
 * Pulls the segment list via Apollo directly (cache-deduped with other
 * callers); filters to MANUAL inline.
 */
export const UserAddToManualSegment = (props: AddUserManualSegmentProps) => {
  const { table, refetch } = props;
  const { t } = useTranslation();
  const { environment } = useAppContext();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const { segmentList } = useSegmentListQuery(environment?.id ?? '', USER_BIZ_TYPE, {
    skip: !environment?.id,
  });
  const manualSegments = useMemo(
    () => segmentList?.filter((seg) => seg.dataType === 'MANUAL') ?? [],
    [segmentList],
  );
  const { addUsers, isAdding } = useAddUsersToSegment();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      if (!hasSelection()) {
        return;
      }

      const selectedIds = collectSelectedIds();
      const success = await addUsers(selectedIds, segment);
      if (success) {
        await refetch();
      }
    },
    [collectSelectedIds, hasSelection, addUsers, refetch],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-2" disabled={isAdding}>
          <PlusIcon className="mr-1 h-4 w-4" />
          {t('users.actions.addToManualSegment')}
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

UserAddToManualSegment.displayName = 'UserAddToManualSegment';
