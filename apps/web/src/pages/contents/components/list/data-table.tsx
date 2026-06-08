'use client';

import { useScrollRoot } from '@/contexts/scroll-root-context';
import { useThemeList } from '@/hooks/use-theme-list';
import { useGetContentVersionQuery } from '@usertour/hooks';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { CircleIcon, SpinnerIcon } from '@usertour/icons';
import { Content, ContentDataType, ContentVersion, Step, Theme } from '@usertour/types';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useInfiniteScroll from 'react-infinite-scroll-hook';
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
  const { t } = useTranslation();

  const isPublished = content?.contentOnEnvironments?.find(
    (item) => item.published && item.environment.id === environment?.id,
  );

  return (
    <div className="grow rounded-b-md py-2.5 px-5 flex flex-col  ">
      <div className="flex-none flex flex-row justify-between items-center space-x-4">
        <span className="grow text-base font-medium text-foreground truncate min-w-0">
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
        <span>{t('contents.listView.card.statusLabel')}</span>
        <div className="flex flex-row space-x-1 items-center ">
          {isPublished && (
            <>
              <CircleIcon className="w-3 h-3 text-success" />
              <span>{t('contents.listView.card.published')}</span>
            </>
          )}
          {!isPublished && (
            <>
              <CircleIcon className="w-3 h-3 text-muted-foreground/50" />
              <span>{t('contents.listView.card.unpublished')}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-none flex flex-row justify-end items-center">
        <span className="text-xs text-muted-foreground">
          {content?.createdAt &&
            t('contents.listView.card.createdAt', {
              time: formatDistanceToNow(new Date(content?.createdAt)),
            })}
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
      className="h-72 min-w-72  flex flex-col bg-card rounded-lg border hover:border-primary hover:shadow-lg dark:hover:shadow-lg-light cursor-pointer"
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
  /** True during the initial / cache-and-network revalidate fetch. */
  loading: boolean;
  /** True during `fetchMore` (NetworkStatus 3). */
  loadingMore: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

export function DataTable(props: DataTableProps) {
  const { contents, contentType, hasNextPage, loading, loadingMore, fetchNextPage, refetch } =
    props;
  const { t } = useTranslation();
  // ScrollArea's Viewport, published by ContentList via ScrollRootProvider —
  // becomes the IntersectionObserver root so the sentinel triggers against
  // the actual scrolling element rather than the window viewport.
  const scrollRoot = useScrollRoot();
  const [sentryRef, { rootRef }] = useInfiniteScroll({
    // Suppress the library's onLoadMore during the initial / revalidate
    // fetch too — passing only `loadingMore` left the base load gated
    // solely by the internal `fetchingRef` inside `fetchNextPage`,
    // which diverged from how `VersionHistoryList` wires the same lib.
    loading: loading || loadingMore,
    hasNextPage,
    onLoadMore: fetchNextPage,
    rootMargin: '0px 0px 200px 0px',
  });
  useEffect(() => {
    rootRef(scrollRoot);
  }, [rootRef, scrollRoot]);

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
          ref={sentryRef}
          className="flex items-center justify-center py-4 text-muted-foreground"
        >
          {loadingMore ? (
            <span className="flex items-center gap-2 text-sm">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              {t('contents.listView.loadingMore')}
            </span>
          ) : (
            <span className="h-px w-full" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}
