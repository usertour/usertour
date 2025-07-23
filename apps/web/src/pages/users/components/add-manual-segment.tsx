import { useToast } from '@usertour-packages/use-toast';
import { useMutation } from '@apollo/client';
import { createBizUserOnSegment } from '@usertour-packages/gql';
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
import { Segment } from '@usertour-packages/types';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { getErrorMessage } from '@usertour-packages/utils';

interface AddUserManualSegmentProps {
  table: Table<any>;
}

export const AddUserManualSegment = (props: AddUserManualSegmentProps) => {
  const { table } = props;
  const [mutation] = useMutation(createBizUserOnSegment);
  const { segmentList } = useSegmentListContext();
  const { toast } = useToast();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      const userOnSegment = [];
      for (const row of table.getFilteredSelectedRowModel().rows) {
        userOnSegment.push({
          bizUserId: row.getValue('id'),
          segmentId: segment.id,
          data: {},
        });
      }
      if (userOnSegment.length === 0) {
        return;
      }

      const data = {
        userOnSegment,
      };
      try {
        const ret = await mutation({ variables: { data } });
        if (ret.data?.createBizUserOnSegment?.success) {
          toast({
            variant: 'success',
            title: `${ret.data?.createBizUserOnSegment.count} users added to ${segment.name}`,
          });
          return;
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [table],
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
