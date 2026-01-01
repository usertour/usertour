import { useToast } from '@usertour-packages/use-toast';
import { useMutation } from '@apollo/client';
import { createBizCompanyOnSegment } from '@usertour-packages/gql';
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
import { getErrorMessage } from '@usertour/helpers';
import { useTableSelection } from '@/hooks/use-table-selection';

interface AddCompanyManualSegmentProps {
  table: Table<any>;
}

export const AddCompanyManualSegment = (props: AddCompanyManualSegmentProps) => {
  const { table } = props;
  const { collectSelectedIds, hasSelection } = useTableSelection(table);
  const [mutation] = useMutation(createBizCompanyOnSegment);
  const { segmentList } = useSegmentListContext();
  const { toast } = useToast();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      if (!hasSelection()) {
        return;
      }

      const companyOnSegment = collectSelectedIds().map((id) => ({
        bizCompanyId: id,
        segmentId: segment.id,
        data: {},
      }));

      const data = {
        companyOnSegment,
      };
      try {
        const ret = await mutation({ variables: { data } });
        if (ret.data?.createBizCompanyOnSegment?.success) {
          toast({
            variant: 'success',
            title: `${ret.data?.createBizCompanyOnSegment.count} companies added to ${segment.name}`,
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [collectSelectedIds, hasSelection, mutation, toast],
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
                key={`${segment.id}`}
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

AddCompanyManualSegment.displayName = 'AddCompanyManualSegment';
