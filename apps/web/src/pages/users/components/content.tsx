import { ListSkeleton } from '@/components/molecules/skeleton';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { UserListProvider } from '@/contexts/user-list-context';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { EditIcon } from '@usertour-ui/icons';
import { Separator } from '@usertour-ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from './data-table';
import { UserEditDropdownMenu } from './edit-dropmenu';
import { UserSegmentEditForm } from './edit-form';
import { UserSegmentFilterSave } from './filter-save';

export function UserListContent(props: { environmentId: string | undefined }) {
  const { environmentId } = props;
  const [open, setOpen] = useState(false);
  const { currentSegment, refetch, loading } = useSegmentListContext();
  const navigate = useNavigate();
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };

  return (
    <UserListProvider environmentId={environmentId}>
      <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
        <div className="flex items-center justify-between ">
          <div className="space-y-1 flex flex-row items-center relative">
            <h2 className="text-xl font-semibold tracking-tight">{currentSegment?.name}</h2>
            {currentSegment?.dataType !== 'ALL' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <EditIcon
                      onClick={() => {
                        setOpen(true);
                      }}
                      className="ml-2 cursor-pointer"
                      width={16}
                      height={16}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-slate-700">
                    <p>Edit user segment name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {<UserSegmentFilterSave currentSegment={currentSegment} />}
          </div>
          {currentSegment && currentSegment.dataType !== 'ALL' && (
            <UserEditDropdownMenu
              segment={currentSegment}
              onSubmit={async () => {
                await refetch();
                navigate(`/env/${environmentId}/users`);
              }}
            >
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsVerticalIcon className="h-4 w-4 " />
              </Button>
            </UserEditDropdownMenu>
          )}
        </div>
        <Separator className="my-4" />
        {loading && <ListSkeleton />}
        {currentSegment && (
          <DataTable published={false} segment={currentSegment} key={currentSegment.id} />
        )}
      </div>
      <UserSegmentEditForm isOpen={open} onClose={handleOnClose} segment={currentSegment} />
    </UserListProvider>
  );
}

UserListContent.displayName = 'UserListContent';
