import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { Button } from '@usertour-ui/button';
import { Archive2LineIcon, Filter2LineIcon, Group2LineIcon, PLUSIcon } from '@usertour-ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Segment } from '@usertour-ui/types';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CompanySegmentCreateForm } from './create-form';
import { useAppContext } from '@/contexts/app-context';
import { CompanySegmentListSkeleton } from './sidebar-skeleton';

export function CompanyListSidebar() {
  const { segmentList, refetch, environmentId, currentSegment, loading } = useSegmentListContext();
  const [_, setSearchParams] = useSearchParams();
  const { isViewOnly } = useAppContext();

  const [open, setOpen] = useState(false);
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };

  const handleOnClick = useCallback(
    (segment: Segment) => {
      if (currentSegment?.id === segment.id) {
        return;
      }
      setSearchParams({ segment_id: segment.id });
    },
    [currentSegment?.id],
  );

  return (
    <>
      <AdminSidebarContainerTemplate>
        <AdminSidebarHeaderTemplate>
          <h2 className="text-2xl font-semibold ">Companies</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={'ghost'}
                  className="p-1 h-auto text-primary"
                  onClick={handleCreate}
                  disabled={isViewOnly}
                >
                  <PLUSIcon width={16} height={16} /> New
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-700">
                <p>Create company segment</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </AdminSidebarHeaderTemplate>

        {/* Show skeleton for segment list when loading, otherwise show actual segments */}
        {loading ? (
          <CompanySegmentListSkeleton />
        ) : (
          <AdminSidebarBodyTemplate>
            <AdminSidebarBodyTitleTemplate>Segments</AdminSidebarBodyTitleTemplate>

            {segmentList?.map((segment, index) => (
              <AdminSidebarBodyItemTemplate
                key={index}
                onClick={() => {
                  handleOnClick(segment);
                }}
                variant={segment.id === currentSegment?.id ? 'secondary' : 'ghost'}
                className={
                  segment.id === currentSegment?.id ? 'bg-gray-200/40 dark:bg-secondary/60  ' : ''
                }
              >
                {segment.dataType === 'CONDITION' && (
                  <Filter2LineIcon width={16} height={16} className="mr-1" />
                )}
                {segment.dataType === 'ALL' && (
                  <Group2LineIcon width={16} height={16} className="mr-1" />
                )}
                {segment.dataType === 'MANUAL' && (
                  <Archive2LineIcon width={16} height={16} className="mr-1" />
                )}
                {segment.name}
              </AdminSidebarBodyItemTemplate>
            ))}
          </AdminSidebarBodyTemplate>
        )}

        <AdminSidebarFooter />
      </AdminSidebarContainerTemplate>
      <CompanySegmentCreateForm
        isOpen={open}
        onClose={handleOnClose}
        environmentId={environmentId}
      />
    </>
  );
}

CompanyListSidebar.displayName = 'CompanyListSidebar';
