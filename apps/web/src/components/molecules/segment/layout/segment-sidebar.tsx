import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { Button } from '@usertour-packages/button';
import {
  Archive2LineIcon,
  Filter2LineIcon,
  GroupLineIcon,
  PLUSIcon,
} from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Segment } from '@usertour/types';
import { Fragment, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SegmentSidebarSkeleton } from './segment-sidebar-skeleton';

interface SegmentSidebarProps {
  title: string;
  groupIcon?: React.ReactElement;
  onCreate?: () => void;
  createTooltip?: string;
  disabled?: boolean;
}

export function SegmentSidebar({
  title,
  groupIcon,
  onCreate,
  createTooltip,
  disabled,
}: SegmentSidebarProps) {
  const { segmentList, currentSegment, loading } = useSegmentListContext();
  const [_, setSearchParams] = useSearchParams();

  // Default to users icon if not provided
  const defaultGroupIcon = useMemo(
    () => <GroupLineIcon width={16} height={16} className="mr-1 flex-none" />,
    [],
  );
  const finalGroupIcon = groupIcon || defaultGroupIcon;

  const handleOnClick = useCallback(
    (segment: Segment) => {
      if (currentSegment && segment.id === currentSegment.id) {
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
          <h2 className="text-2xl font-semibold">{title}</h2>
          {onCreate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={'ghost'}
                    className="p-1 h-auto text-primary"
                    onClick={onCreate}
                    disabled={disabled}
                  >
                    <PLUSIcon width={16} height={16} /> New
                  </Button>
                </TooltipTrigger>
                {createTooltip && (
                  <TooltipContent className="max-w-xs bg-slate-700">
                    <p>{createTooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </AdminSidebarHeaderTemplate>

        {/* Show skeleton for segment list when loading, otherwise show actual segments */}
        {loading ? (
          <SegmentSidebarSkeleton />
        ) : (
          <AdminSidebarBodyTemplate>
            <AdminSidebarBodyTitleTemplate>Segments</AdminSidebarBodyTitleTemplate>
            {segmentList?.map((segment) => (
              <Fragment key={`${segment.environmentId}-${segment.id}`}>
                <AdminSidebarBodyItemTemplate
                  variant={segment.id === currentSegment?.id ? 'secondary' : 'ghost'}
                  className={
                    segment.id === currentSegment?.id ? 'bg-gray-200/40 dark:bg-secondary/60  ' : ''
                  }
                  onClick={() => {
                    handleOnClick(segment);
                  }}
                >
                  {segment.dataType === 'CONDITION' && (
                    <Filter2LineIcon width={16} height={16} className="mr-1 flex-none" />
                  )}
                  {segment.dataType === 'ALL' && finalGroupIcon}
                  {segment.dataType === 'MANUAL' && (
                    <Archive2LineIcon width={16} height={16} className="mr-1 flex-none" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-left">{segment.name}</span>{' '}
                </AdminSidebarBodyItemTemplate>
              </Fragment>
            ))}
          </AdminSidebarBodyTemplate>
        )}

        <AdminSidebarFooter />
      </AdminSidebarContainerTemplate>
    </>
  );
}
