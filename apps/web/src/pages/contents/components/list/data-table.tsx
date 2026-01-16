'use client';

import { useContentListContext } from '@/contexts/content-list-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { useQuery } from '@apollo/client';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { getContentVersion } from '@usertour-packages/gql';
import { CircleIcon } from '@usertour-packages/icons';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour/types';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScaledPreviewContainer } from '@usertour-packages/shared-components';
import { ContentEditDropdownMenu } from '../shared/content-edit-dropmenu';
import {
  ChecklistPreview,
  EmptyContentPreview,
  FlowPreview,
  LauncherPreview,
} from '../shared/content-preview';
import { columns } from './columns';
import { DataTablePagination } from './data-table-pagination';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-packages/button';
import { Skeleton } from '@usertour-packages/skeleton';

const ContentPreviewFooter = ({ content }: { content: Content }) => {
  const { refetch } = useContentListContext();
  const { isViewOnly, environment } = useAppContext();

  const isPublished = content?.contentOnEnvironments?.find(
    (item) => item.published && item.environment.id === environment?.id,
  );

  return (
    <div className="grow rounded-b-md py-2.5 px-5 flex flex-col  ">
      <div className="flex-none flex flex-row justify-between items-center space-x-4">
        <span className="grow text-base font-medium text-gray-900 dark:text-white truncate min-w-0">
          {content.name ?? ''}
        </span>

        <ContentEditDropdownMenu
          content={content}
          onSubmit={() => {
            refetch();
          }}
          disabled={isViewOnly}
        >
          <Button variant="ghost" size="icon" className="flex-none">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </ContentEditDropdownMenu>
      </div>
      <div className="grow flex flex-row text-sm items-center space-x-1 text-xs">
        <span>Status:</span>
        <div className="flex flex-row space-x-1 items-center ">
          {isPublished && (
            <>
              <CircleIcon className="w-3 h-3 text-success" />
              <span>Published</span>
            </>
          )}
          {!isPublished && (
            <>
              <CircleIcon className="w-3 h-3 text-slate-300" />
              <span>Unpublished</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-none flex flex-row justify-end items-center">
        <span className="text-xs text-muted-foreground">
          Created at {content?.createdAt && formatDistanceToNow(new Date(content?.createdAt))} ago
        </span>
      </div>
    </div>
  );
};

const ContentPreviewSkeleton = () => {
  return <Skeleton className="w-[300px] h-[160px]" />;
};

interface ContentPreviewProps {
  currentVersion: ContentVersion | undefined;
  currentTheme: Theme | undefined;
  currentStep: Step | undefined;
  type: ContentDataType;
  isLoading?: boolean;
}

const ContentPreview = ({
  currentVersion,
  currentTheme,
  currentStep,
  type,
  isLoading,
}: ContentPreviewProps) => {
  // Show skeleton while loading data
  if (isLoading) {
    return <ContentPreviewSkeleton />;
  }

  if (
    (type === ContentDataType.FLOW ||
      type === ContentDataType.NPS ||
      type === ContentDataType.SURVEY) &&
    currentTheme &&
    currentStep
  ) {
    return (
      <ScaledPreviewContainer>
        <FlowPreview currentTheme={currentTheme} currentStep={currentStep} />
      </ScaledPreviewContainer>
    );
  }

  if (type === ContentDataType.LAUNCHER && currentTheme && currentVersion) {
    return (
      <ScaledPreviewContainer>
        <LauncherPreview currentTheme={currentTheme} currentVersion={currentVersion} />
      </ScaledPreviewContainer>
    );
  }

  if (
    type === ContentDataType.CHECKLIST &&
    currentTheme &&
    currentVersion &&
    currentVersion?.data
  ) {
    return (
      <ScaledPreviewContainer>
        <ChecklistPreview currentTheme={currentTheme} currentVersion={currentVersion} />
      </ScaledPreviewContainer>
    );
  }

  // Only show empty state when not loading and truly no data
  return <EmptyContentPreview />;
};

const ContentTableItem = ({
  content,
  contentType,
}: {
  content: Content;
  contentType: string;
}) => {
  const { data, loading } = useQuery(getContentVersion, {
    variables: { versionId: content?.editedVersionId },
    skip: !content?.editedVersionId,
  });
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { environment } = useAppContext();
  const { themeList } = useThemeListContext();

  // Derive all preview data in one pass to avoid chained useEffects and multiple re-renders
  const { currentVersion, currentStep, currentTheme } = useMemo(() => {
    const version = data?.getContentVersion;
    const step = version?.steps?.[0];

    let theme: Theme | undefined;
    if (themeList && themeList.length > 0) {
      const themeId = step?.themeId ?? version?.themeId;
      if (themeId) {
        theme = themeList.find((item) => item.id === themeId);
      }
    }

    return {
      currentVersion: version,
      currentStep: step,
      currentTheme: theme,
    };
  }, [data, themeList]);

  // Consider loading if query is loading or themeList is not ready yet
  const isLoading = loading || !themeList;

  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current as any;
      if (el?.contains(e.target)) {
        navigate(`/env/${environment?.id}/${contentType}/${content.id}/detail`);
      }
    },
    [content, environment?.id, contentType, navigate],
  );

  return (
    <div
      onClick={handleOnClick}
      ref={containerRef}
      className="h-72 min-w-72  flex flex-col bg-white rounded-lg border hover:border-primary dark:border-gray-800 dark:hover:border-gray-700 hover:shadow-lg dark:hover:shadow-lg-light dark:bg-gray-900 cursor-pointer"
    >
      <div className="flex-none bg-muted rounded-t-md">
        <div
          className="h-48 flex justify-center items-center overflow-hidden"
          {...({ inert: '' } as any)}
        >
          <ContentPreview
            currentVersion={currentVersion}
            currentTheme={currentTheme}
            currentStep={currentStep}
            type={content.type}
            isLoading={isLoading}
          />
        </div>
      </div>
      <ContentPreviewFooter content={content} />
    </div>
  );
};

export function DataTable() {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { setPagination, pagination, pageCount, contents, contentType } = useContentListContext();

  const table = useReactTable({
    data: contents,
    columns,
    pageCount,
    manualPagination: true,
    state: {
      sorting,
      pagination,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4">
      {/* <DataTableToolbar table={table} /> */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-4">
        {contents.map((content) => (
          <ContentTableItem content={content} key={content.id} contentType={contentType} />
        ))}
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
