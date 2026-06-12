'use client';

import { useScrollRoot } from '@/contexts/scroll-root-context';
import { useThemeList } from '@/hooks/use-theme-list';
import { useGetContentVersionQuery } from '@usertour/hooks';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { SpinnerIcon } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
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
    <div className="flex flex-1 flex-col justify-center gap-1.5 px-4 py-3">
      {/* Row 1 — name + status pill */}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {content.name ?? ''}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
          <span
            className={cn(
              'size-1.5 rounded-full',
              isPublished ? 'bg-success' : 'bg-muted-foreground/40',
            )}
          />
          <span className={isPublished ? 'text-foreground' : 'text-muted-foreground'}>
            {isPublished
              ? t('contents.listView.card.published')
              : t('contents.listView.card.unpublished')}
          </span>
        </span>
      </div>
      {/* Row 2 — last-updated time + row actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {content?.updatedAt &&
            t('contents.listView.card.updatedAt', {
              time: formatDistanceToNow(new Date(content.updatedAt)),
            })}
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
            className="-mr-1.5 size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </ContentEditDropdownMenu>
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
      // Content card boundary: light lifts it off the page with a layered
      // soft shadow (no visible border, per the Cards convention); dark has
      // no usable shadow and bg-card alone is too close to the page, so it
      // gets a faint hairline ring instead. Hover deepens the shadow / ring
      // and nudges up — never recolors a border.
      className={cn(
        'group flex h-72 cursor-pointer flex-col overflow-hidden rounded-xl bg-card',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.06)]',
        'dark:shadow-none dark:ring-1 dark:ring-white/[0.08]',
        'transition-[box-shadow,transform] duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(16,24,40,0.12)]',
        'dark:hover:ring-white/[0.16]',
      )}
    >
      <div
        className="flex h-48 flex-none items-center justify-center overflow-hidden bg-muted dark:bg-surface"
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
