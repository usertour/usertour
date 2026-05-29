'use client';

import { useThemeList } from '@/hooks/use-theme-list';
import { useGetContentVersionQuery } from '@usertour/hooks';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { CircleIcon, SpinnerIcon } from '@usertour/icons';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour/types';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { AutoScaledPreviewContainer, Button, Skeleton } from '@usertour/ui';
import { ContentEditDropdownMenu } from '../shared/content-edit-dropmenu';
import {
  BannerPreviewContent,
  ChecklistPreview,
  EmptyContentPreview,
  FlowPreview,
  LauncherPreview,
  ResourceCenterPreview,
  TrackerPreview,
} from '../shared/content-preview';
import { useAppContext } from '@/contexts/app-context';

const ContentPreviewFooter = ({
  content,
  refetch,
}: {
  content: Content;
  refetch: () => Promise<unknown>;
}) => {
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
          <Button
            variant="ghost"
            size="icon"
            className="flex-none"
            onClick={(e) => e.stopPropagation()}
          >
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
  return <Skeleton className="w-full h-full" />;
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

  if (type === ContentDataType.FLOW && currentTheme && currentStep) {
    // Find the index of currentStep in the steps array
    const stepIndex = currentVersion?.steps?.findIndex((step) => step.id === currentStep.id);
    const currentStepIndex = stepIndex !== undefined && stepIndex >= 0 ? stepIndex : 0;

    return (
      <AutoScaledPreviewContainer padding={16}>
        <FlowPreview
          currentTheme={currentTheme}
          currentStep={currentStep}
          currentVersion={currentVersion}
          currentStepIndex={currentStepIndex}
        />
      </AutoScaledPreviewContainer>
    );
  }

  if (type === ContentDataType.LAUNCHER && currentTheme && currentVersion) {
    return (
      <AutoScaledPreviewContainer padding={16}>
        <LauncherPreview currentTheme={currentTheme} currentVersion={currentVersion} />
      </AutoScaledPreviewContainer>
    );
  }

  if (
    type === ContentDataType.CHECKLIST &&
    currentTheme &&
    currentVersion &&
    currentVersion?.data
  ) {
    return (
      <AutoScaledPreviewContainer padding={16}>
        <ChecklistPreview currentTheme={currentTheme} currentVersion={currentVersion} />
      </AutoScaledPreviewContainer>
    );
  }

  if (
    type === ContentDataType.RESOURCE_CENTER &&
    currentTheme &&
    currentVersion &&
    currentVersion?.data
  ) {
    return (
      <AutoScaledPreviewContainer padding={16}>
        <ResourceCenterPreview currentTheme={currentTheme} currentVersion={currentVersion} />
      </AutoScaledPreviewContainer>
    );
  }

  if (type === ContentDataType.BANNER && currentTheme && currentVersion) {
    return (
      <AutoScaledPreviewContainer padding={16}>
        <BannerPreviewContent
          currentTheme={currentTheme}
          currentVersion={currentVersion}
          previewClassName="justify-start"
        />
      </AutoScaledPreviewContainer>
    );
  }

  if (type === ContentDataType.TRACKER && currentVersion) {
    return <TrackerPreview currentVersion={currentVersion} />;
  }

  // Only show empty state when not loading and truly no data
  return <EmptyContentPreview />;
};

const ContentTableItem = ({
  content,
  contentType,
  refetch,
}: {
  content: Content;
  contentType: string;
  refetch: () => Promise<unknown>;
}) => {
  const { version: editedVersion, loading } = useGetContentVersionQuery(content?.editedVersionId);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { environment } = useAppContext();
  const { themeList } = useThemeList();

  // Derive all preview data in one pass to avoid chained useEffects and multiple re-renders
  const { currentVersion, currentStep, currentTheme } = useMemo(() => {
    const step = editedVersion?.steps?.[0];

    let theme: Theme | undefined;
    if (themeList && themeList.length > 0) {
      const themeId = step?.themeId ?? editedVersion?.themeId;
      if (themeId) {
        theme = themeList.find((item) => item.id === themeId);
      }
    }

    return {
      currentVersion: editedVersion ?? undefined,
      currentStep: step,
      currentTheme: theme,
    };
  }, [editedVersion, themeList]);

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
      <ContentPreviewFooter content={content} refetch={refetch} />
    </div>
  );
};

interface DataTableProps {
  contents: Content[];
  contentType: string;
  hasNextPage: boolean;
  loadingMore: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

export function DataTable(props: DataTableProps) {
  const { contents, contentType, hasNextPage, loadingMore, fetchNextPage, refetch } = props;
  // Sentinel at the bottom of the grid — when it scrolls into view we
  // pull the next cursor page. Same pattern as the version-history list.
  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasNextPage && !loadingMore) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, loadingMore, fetchNextPage]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {contents.map((content) => (
          <ContentTableItem
            content={content}
            key={content.id}
            contentType={contentType}
            refetch={refetch}
          />
        ))}
      </div>
      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-4 text-muted-foreground"
        >
          {loadingMore ? (
            <span className="flex items-center gap-2 text-sm">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Loading…
            </span>
          ) : (
            <span className="h-px w-full" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}
