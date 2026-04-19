import { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { PlusIcon } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useManualSegments } from '@/hooks/use-manual-segments';
import { useAddUsersToSegment } from '@/hooks/use-add-users-to-segment';

interface AddUserManualSegmentProps {
  table: Table<any>;
}

/**
 * Component for adding selected users to manual segments
 */
export const AddUserManualSegment = (props: AddUserManualSegmentProps) => {
  const { table } = props;
  const { t } = useTranslation();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const { manualSegments } = useManualSegments();
  const { addUsers, isAdding } = useAddUsersToSegment();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      // Check if any users are selected
      if (!hasSelection()) {
        return;
      }

      const selectedIds = collectSelectedIds();
      await addUsers(selectedIds, segment);
    },
    [collectSelectedIds, hasSelection, addUsers],
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
        {manualSegments?.map((segment) => (
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

AddUserManualSegment.displayName = 'AddUserManualSegment';
