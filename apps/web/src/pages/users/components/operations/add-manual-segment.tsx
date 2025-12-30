import { useToast } from '@usertour-packages/use-toast';
import { useMutation } from '@apollo/client';
import { createBizUserOnSegment } from '@usertour-packages/gql';
import { useTranslation } from 'react-i18next';
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

interface AddUserManualSegmentProps {
  table: Table<any>;
}

export const AddUserManualSegment = (props: AddUserManualSegmentProps) => {
  const { table } = props;
  const [mutation] = useMutation(createBizUserOnSegment);
  const { segmentList } = useSegmentListContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleAddManualSegment = useCallback(
    async (segment: Segment) => {
      const userOnSegment = [];
      for (const row of table.getFilteredSelectedRowModel().rows) {
        userOnSegment.push({
          bizUserId: row.original.id,
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
            title: t('users.toast.segments.usersAdded', {
              count: ret.data?.createBizUserOnSegment.count,
              segmentName: segment.name,
            }),
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
                key={segment.id}
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
