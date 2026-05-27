import { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { PlusIcon } from '@usertour/icons';
import { Button } from '@usertour/button';
import { Table } from '@tanstack/react-table';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useManualSegments } from '@/hooks/use-manual-segments';
import { useAddCompaniesToManualSegment } from '@/hooks/use-add-companies-to-manual-segment';

interface AddCompanyManualSegmentProps {
  table: Table<any>;
}

/**
 * Component for adding selected companies to manual segments
 */
export const AddCompanyManualSegment = (props: AddCompanyManualSegmentProps) => {
  const { table } = props;
  const { t } = useTranslation();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const { manualSegments } = useManualSegments();
  const { addCompanies, isAdding } = useAddCompaniesToManualSegment();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      // Check if any companies are selected
      if (!hasSelection()) {
        return;
      }

      const selectedIds = collectSelectedIds();
      await addCompanies(selectedIds, segment);
    },
    [collectSelectedIds, hasSelection, addCompanies],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-2" disabled={isAdding}>
          <PlusIcon className="mr-1 h-4 w-4" />
          {t('companies.actions.addToManualSegment')}
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

AddCompanyManualSegment.displayName = 'AddCompanyManualSegment';
