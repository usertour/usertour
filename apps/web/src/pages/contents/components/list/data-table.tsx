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
import { getContentVersion } from '@usertour-ui/gql';
import { CircleIcon } from '@usertour-ui/icons';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour-ui/types';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContentEditDropdownMenu } from '../shared/content-edit-dropmenu';
import {
  ChecklistPreview,
  EmptyContentPreview,
  FlowPreview,
  LauncherPreview,
  ScaledPreviewContainer,
} from '../shared/content-preview';
import { columns } from './columns';
import { DataTablePagination } from './data-table-pagination';
import { useAppContext } from '@/contexts/app-context';

const ContentPreviewFooter = ({ content }: { content: Content }) => {
  const { refetch } = useContentListContext();
  const { isViewOnly } = useAppContext();

  return (
    <div className="grow rounded-b-md py-2.5 px-5 flex flex-col  ">
      <div className="flex-none flex flex-row justify-between items-center space-x-4">
        <span className="grow text-base font-medium text-gray-900 dark:text-white truncate ...	">
          {content.name}{' '}
        </span>

        <ContentEditDropdownMenu
          content={content}
          onSubmit={() => {
            refetch();
          }}
          disabled={isViewOnly}
        >
          <DotsHorizontalIcon className="h-4 w-4 flex-none" />
        </ContentEditDropdownMenu>
      </div>
      <div className="grow flex flex-row text-sm items-center space-x-1 text-xs">
        <span>Status:</span>
        <div className="flex flex-row space-x-1 items-center ">
          {content.published && (
            <>
              <CircleIcon className="w-3 h-3 text-success" />
              <span>Published</span>
            </>
          )}
          {!content.published && (
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

const ContentPreview = ({
  currentVersion,
  currentTheme,
  currentStep,
  type,
}: {
  currentVersion: ContentVersion | undefined;
  currentTheme: Theme | undefined;
  currentStep: Step | undefined;
  type: ContentDataType;
}) => {
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

  return <EmptyContentPreview />;
};

const ContentTableItem = ({
  content,
  contentType,
}: {
  content: Content;
  contentType: string;
}) => {
  const { data } = useQuery(getContentVersion, {
    variables: { versionId: content?.editedVersionId },
  });
  const navigate = useNavigate();
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | undefined>();
  const containerRef = useRef(null);
  const [currentStep, setCurrentStep] = useState<Step | undefined>();
  const [currentTheme, setCurrentTheme] = useState<Theme | undefined>();

  const { themeList } = useThemeListContext();

  useEffect(() => {
    if (data?.getContentVersion) {
      setCurrentVersion(data.getContentVersion);
    }
  }, [data]);

  useEffect(() => {
    if (currentVersion?.steps && currentVersion.steps?.length > 0) {
      setCurrentStep(currentVersion.steps[0]);
    }
  }, [currentVersion]);

  useEffect(() => {
    if (!themeList) {
      return;
    }
    if (themeList.length > 0) {
      let theme: Theme | undefined;
      if (currentStep?.themeId) {
        theme = themeList.find((item) => item.id === currentStep.themeId);
      } else if (currentVersion?.themeId) {
        theme = themeList.find((item) => item.id === currentVersion.themeId);
      }
      if (theme) {
        setCurrentTheme(theme);
      }
    }
  }, [currentStep, themeList, currentVersion]);

  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current as any;
      if (el?.contains(e.target)) {
        navigate(`/env/${content.environmentId}/${contentType}/${content.id}/detail`);
      }
    },
    [content],
  );

  return (
    <div
      onClick={handleOnClick}
      ref={containerRef}
      className="h-72 min-w-72  flex flex-col bg-white rounded-lg border hover:border-primary dark:border-gray-800 dark:hover:border-gray-700 hover:shadow-lg dark:hover:shadow-lg-light dark:bg-gray-900 cursor-pointer"
    >
      <div className="flex-none bg-muted rounded-t-md">
        <div className="h-48 flex justify-center items-center overflow-hidden">
          <ContentPreview
            currentVersion={currentVersion}
            currentTheme={currentTheme}
            currentStep={currentStep}
            type={content.type}
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
