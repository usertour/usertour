import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { UserIcon3 } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { useCallback } from 'react';
import { Segment } from '@usertour/types';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useAddUsersToSegment } from '@/hooks/use-add-users-to-segment';

interface AddUserManualSegmentProps {
  table: Table<any>;
}

export const AddUserManualSegment = (props: AddUserManualSegmentProps) => {
  const { table } = props;
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const { addUsers } = useAddUsersToSegment();
  const { segmentList } = useSegmentListContext();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      if (!hasSelection()) return;

      const selectedIds = collectSelectedIds();
      await addUsers(selectedIds, segment.id, segment.name);
    },
    [collectSelectedIds, hasSelection, addUsers],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={'ghost'} className="h-8 text-primary hover:text-primary px-1 ">
          <UserIcon3 width={16} height={16} className="mr-1" />
          Add to manual segment
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {segmentList?.map(
          (segment) =>
            segment.dataType === 'MANUAL' && (
              <DropdownMenuItem
                key={`${segment.environmentId}-${segment.id}`}
                className="cursor-pointer min-w-[180px]"
                onSelect={() => {
                  handleAddManualSegment(segment);
                }}
              >
                {segment.name}
              </DropdownMenuItem>
            ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

AddUserManualSegment.displayName = 'AddUserManualSegment';
