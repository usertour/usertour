import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { EditIcon } from '@usertour/icons';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDataTable } from './user-data-table';
import { UserEditDropdownMenu } from './user-edit-dropdown-menu';
import { SegmentEditDialog } from '@/components/segments';
import { UserSegmentFilterSave } from './user-segment-filter-save';
import type { CurrentConditions, Segment } from '@usertour/types';

interface UserListContentProps {
  environmentId: string;
  currentSegment: Segment | undefined;
  refetchSegments: () => Promise<unknown>;
  segmentsIsRefetching: boolean;
}

export const UserListContent = (props: UserListContentProps) => {
  const { environmentId, currentSegment, refetchSegments, segmentsIsRefetching } = props;
  const [open, setOpen] = useState(false);
  // currentConditions = the user's typed-but-not-saved filter. Lives here
  // because both the FilterSave button in the header AND the DataTable
  // toolbar (which mutates it) need to see the same value.
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions | undefined>();
  const { isViewOnly } = useAppContext();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleOnClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOnSubmit = useCallback(
    (success: boolean) => {
      if (success) {
        refetchSegments();
      }
    },
    [refetchSegments],
  );

  return (
    <>
      <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
        <div className="flex items-center justify-between ">
          <div className="space-y-1 flex flex-row items-center relative">
            <h2 className="text-xl font-semibold tracking-tight">{currentSegment?.name}</h2>
            {currentSegment && currentSegment.dataType !== 'ALL' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-8 h-8 ml-2 cursor-pointer"
                      disabled={isViewOnly}
                      onClick={() => {
                        setOpen(true);
                      }}
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-slate-700">
                    <p>{t('users.segments.tooltips.editName')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <UserSegmentFilterSave
              currentSegment={currentSegment}
              currentConditions={currentConditions}
              refetchSegments={refetchSegments}
              isRefetching={segmentsIsRefetching}
            />
          </div>
          {currentSegment && currentSegment.dataType !== 'ALL' && (
            <UserEditDropdownMenu
              segment={currentSegment}
              disabled={isViewOnly}
              onSubmit={async () => {
                await refetchSegments();
                navigate(`/env/${environmentId}/users`);
              }}
            >
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsHorizontalIcon className="h-4 w-4 " />
              </Button>
            </UserEditDropdownMenu>
          )}
        </div>
        <Separator className="my-4" />
        {currentSegment && (
          <UserDataTable
            segment={currentSegment}
            environmentId={environmentId}
            setCurrentConditions={setCurrentConditions}
            key={currentSegment.id}
          />
        )}
      </div>
      <SegmentEditDialog
        entity="user"
        isOpen={open}
        onClose={handleOnClose}
        onSubmit={handleOnSubmit}
        segment={currentSegment}
      />
    </>
  );
};

UserListContent.displayName = 'UserListContent';
