import AdminSidebarFooter from '@/components/admin-sidebar/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/admin-sidebar/admin-sidebar-template';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/ui';
import { Archive2LineIcon, Filter2LineIcon, GroupLineIcon, PLUSIcon } from '@usertour/icons';
import { Segment } from '@usertour/types';
import { Fragment, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { syncedSegmentProvider } from '@/utils/segment';
import { SegmentSidebarSkeleton } from './segment-sidebar-skeleton';

interface SegmentSidebarProps {
  title: string;
  // Caller passes data via props. Sidebar stays presentational so the
  // same component can serve users / companies / future entity pages
  // without coupling to a specific list-fetch hook.
  segmentList: Segment[] | undefined;
  currentSegment: Segment | undefined;
  loading: boolean;
  groupIcon?: React.ReactElement;
  onCreate?: () => void;
  createTooltip?: string;
  disabled?: boolean;
}

export function SegmentSidebar({
  title,
  segmentList,
  currentSegment,
  loading,
  groupIcon,
  onCreate,
  createTooltip,
  disabled,
}: SegmentSidebarProps) {
  const [_, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

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
          <h2 className="min-w-0 truncate text-lg font-medium">{title}</h2>
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
                    <PLUSIcon width={16} height={16} /> {t('segments.sidebar.new')}
                  </Button>
                </TooltipTrigger>
                {createTooltip && (
                  <TooltipContent className="max-w-xs">
                    <p>{createTooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </AdminSidebarHeaderTemplate>

        {/* Skeleton only while loading WITH nothing to show (first load / env
            switch). A refetch — column settings save on a segment, create /
            delete / rename all refetchQueries: ['listSegment'] — flips
            `loading` too (notifyOnNetworkStatusChange), but the cached list is
            still valid: keep rendering it and let the result swap in place,
            instead of flashing the whole rail to skeleton for a beat. Every
            environment carries its system "All" segment, so an empty list
            reliably means "not loaded yet", never real data. */}
        {loading && !segmentList?.length ? (
          <SegmentSidebarSkeleton />
        ) : (
          <AdminSidebarBodyTemplate>
            <AdminSidebarBodyTitleTemplate>
              {t('segments.sidebar.segments')}
            </AdminSidebarBodyTitleTemplate>
            {segmentList?.map((segment) => {
              const syncedProvider = syncedSegmentProvider(segment);
              return (
                <Fragment key={`${segment.environmentId}-${segment.id}`}>
                  <AdminSidebarBodyItemTemplate
                    variant={segment.id === currentSegment?.id ? 'secondary' : 'ghost'}
                    className={
                      segment.id === currentSegment?.id
                        ? 'bg-gray-200/40 dark:bg-secondary/60  '
                        : ''
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
                    {syncedProvider?.imagePath && (
                      <img
                        src={syncedProvider.imagePath}
                        alt={t('segments.synced.logoAlt', { provider: syncedProvider.name })}
                        title={t('segments.synced.badge', { provider: syncedProvider.name })}
                        className="ml-1 h-3.5 w-3.5 flex-none rounded-[3px]"
                      />
                    )}
                  </AdminSidebarBodyItemTemplate>
                </Fragment>
              );
            })}
          </AdminSidebarBodyTemplate>
        )}

        <AdminSidebarFooter />
      </AdminSidebarContainerTemplate>
    </>
  );
}
