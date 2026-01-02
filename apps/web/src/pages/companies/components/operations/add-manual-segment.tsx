import { useCallback } from 'react';
import { memo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { UserIcon3 } from '@usertour-packages/icons';
import { Button } from '@usertour-packages/button';
import { Table } from '@tanstack/react-table';
import { Segment } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useManualSegments } from '@/hooks/use-manual-segments';
import { useAddCompaniesToManualSegment } from '@/hooks/use-add-companies-to-manual-segment';
import { useToast } from '@usertour-packages/use-toast';

interface AddCompanyManualSegmentProps {
  table: Table<any>;
}

/**
 * Component for adding selected companies to manual segments
 */
export const AddCompanyManualSegment = memo((props: AddCompanyManualSegmentProps) => {
  const { table } = props;
  const { t } = useTranslation();
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const { manualSegments } = useManualSegments();
  const { addCompaniesToSegment, isAdding } = useAddCompaniesToManualSegment();
  const { toast } = useToast();

  const handleSuccess = useCallback(
    (count: number, segmentName: string) => {
      toast({
        variant: 'success',
        title: t('companies.toast.segments.companiesAdded', {
          count,
          segmentName,
        }),
      });
    },
    [toast, t],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      toast({
        variant: 'destructive',
        title: errorMessage,
      });
    },
    [toast],
  );

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      // Validate segment
      if (!segment?.id) {
        return;
      }

      // Check if any companies are selected
      if (!hasSelection()) {
        return;
      }

      const selectedIds = collectSelectedIds();

      // Double-check we have selected IDs after collection
      if (!selectedIds || selectedIds.length === 0) {
        return;
      }

      const result = await addCompaniesToSegment(selectedIds, segment);

      if (result.success) {
        handleSuccess(result.count || 0, segment.name);
      } else {
        handleError(result.error ?? 'Unknown error');
      }
    },
    [collectSelectedIds, hasSelection, addCompaniesToSegment, handleSuccess, handleError],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 text-primary hover:text-primary px-1"
          disabled={isAdding}
        >
          <UserIcon3 width={16} height={16} className="mr-1" />
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
});

AddCompanyManualSegment.displayName = 'AddCompanyManualSegment';
