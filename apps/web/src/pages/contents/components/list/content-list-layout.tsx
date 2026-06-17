import { Button, Separator, NewItemButton } from '@usertour/ui';
import { ContentListSkeleton } from './content-list-skeleton';
import { useAppContext } from '@/contexts/app-context';
import { useContentList } from '@/hooks/use-content-list';
import { EmptyPlaceholder } from '@/components/segments/ui';
import { ArrowRightIcon } from '@usertour/icons';
import { useContentCount } from '@usertour/hooks';
import { getQueryType } from '@/utils/content';
import { DataTable } from './data-table';
import { useState, useCallback, useMemo, ReactNode, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

interface ContentListLayoutProps {
  contentType: string;
  title: string;
  description: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  createButtonText: string;
  createForm: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit?: (success: boolean) => void;
  }) => ReactNode;
  buttonId?: string;
  // Optional: custom filtered empty state messages
  filteredEmptyTitle?: string;
  filteredEmptyDescription?: string;
  filteredEmptyDraftTitle?: string;
  filteredEmptyDraftDescription?: string;
}

// Separate CreateButton component to avoid inline function recreation
interface CreateButtonProps {
  onClick: () => void;
  disabled: boolean;
  text: string;
  id?: string;
  className?: string;
}

const CreateButton = memo(({ onClick, disabled, text, id, className }: CreateButtonProps) => (
  <NewItemButton onClick={onClick} className={className} id={id} disabled={disabled} label={text} />
));

CreateButton.displayName = 'CreateButton';

// Content state type for switch-based rendering
type ContentState = 'loading' | 'empty' | 'filteredEmpty' | 'filteredEmptyDraft' | 'data';

export const ContentListLayout = memo(
  ({
    contentType,
    title,
    description,
    emptyTitle,
    emptyDescription,
    createButtonText,
    createForm,
    buttonId,
    filteredEmptyTitle,
    filteredEmptyDescription,
    filteredEmptyDraftTitle,
    filteredEmptyDraftDescription,
  }: ContentListLayoutProps) => {
    const [open, setOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation();
    const { isViewOnly, environment } = useAppContext();
    const { contents, hasNextPage, loadingMore, fetchNextPage, refetch, loading } = useContentList(
      environment?.id,
      contentType,
    );

    // Derive from URL so draft count is fetched on first paint when visiting ?published=1
    // (`useContentList` reads URL on every render so its `published` value also matches)
    const isPublishedView = searchParams.get('published') === '1';

    // Only fetch draft count when in Published view to check if draft content exists
    const { totalCount: draftCount, refetch: refetchDraftCount } = useContentCount({
      environmentId: environment?.id,
      type: getQueryType(contentType),
      published: false,
      skip: !isPublishedView, // Skip if not in Published view
    });

    const { totalCount: publishedCount, refetch: refetchPublishedCount } = useContentCount({
      environmentId: environment?.id,
      type: getQueryType(contentType),
      published: true,
      skip: isPublishedView, // Skip if in Published view
    });

    const openCreateFormHandler = useCallback(() => {
      setOpen(true);
    }, []);

    const handleGoToDraft = useCallback(() => {
      setSearchParams({ published: '0' }, { replace: false });
    }, [setSearchParams]);

    // Compute content state once to avoid multiple conditional checks
    const contentLength = contents?.length ?? 0;
    const contentState = useMemo<ContentState>(() => {
      if (loading) return 'loading';
      if (contentLength === 0) {
        // In Published view with draft content = filtered empty
        if (isPublishedView && draftCount > 0) return 'filteredEmpty';
        if (!isPublishedView && publishedCount > 0) return 'filteredEmptyDraft';
        return 'empty';
      }
      return 'data';
    }, [loading, contentLength, isPublishedView, draftCount, publishedCount]);

    // Refetch counts when content list length changes to ensure UI state is in sync
    // This fixes the issue where unpublishing the last content shows Create button instead of Go to Draft
    // Using contentLength instead of contents to avoid unnecessary refetches when only the array reference changes
    useEffect(() => {
      if (isPublishedView) {
        refetchDraftCount();
      } else {
        refetchPublishedCount();
      }
    }, [contentLength, isPublishedView, refetchDraftCount, refetchPublishedCount]);

    const lowerTitle = title.toLowerCase();
    const displayTitle = isPublishedView
      ? t('contents.listView.displayTitle.published', { title: lowerTitle })
      : t('contents.listView.displayTitle.draft', { title: lowerTitle });

    // Default filtered empty messages based on title
    const actualFilteredEmptyTitle =
      filteredEmptyTitle ?? t('contents.listView.filteredEmpty.title', { title: lowerTitle });
    const actualFilteredEmptyDescription =
      filteredEmptyDescription ?? t('contents.listView.filteredEmpty.description');
    const actualFilteredEmptyDraftTitle =
      filteredEmptyDraftTitle ??
      t('contents.listView.filteredEmptyDraft.title', { title: lowerTitle });
    const actualFilteredEmptyDraftDescription =
      filteredEmptyDraftDescription ?? t('contents.listView.filteredEmptyDraft.description');

    // Render main content based on state using switch
    const handleGoToPublished = useCallback(() => {
      setSearchParams({ published: '1' }, { replace: false });
    }, [setSearchParams]);

    const renderContent = useMemo(() => {
      switch (contentState) {
        case 'loading':
          return <ContentListSkeleton count={9} />;
        case 'empty':
          return (
            <EmptyPlaceholder name={emptyTitle} description={emptyDescription}>
              <CreateButton
                onClick={openCreateFormHandler}
                disabled={isViewOnly}
                text={createButtonText}
              />
            </EmptyPlaceholder>
          );
        case 'filteredEmpty':
          return (
            <EmptyPlaceholder
              name={actualFilteredEmptyTitle}
              description={actualFilteredEmptyDescription}
            >
              <Button onClick={handleGoToDraft} variant="outline">
                {t('contents.listView.goToDraft')}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </EmptyPlaceholder>
          );
        case 'filteredEmptyDraft':
          return (
            <EmptyPlaceholder
              name={actualFilteredEmptyDraftTitle}
              description={actualFilteredEmptyDraftDescription}
            >
              <Button onClick={handleGoToPublished} variant="outline">
                {t('contents.listView.goToPublished')}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </EmptyPlaceholder>
          );
        case 'data':
          return (
            <DataTable
              contents={contents}
              contentType={contentType}
              hasNextPage={hasNextPage}
              loading={loading}
              loadingMore={loadingMore}
              fetchNextPage={fetchNextPage}
              refetch={refetch}
            />
          );
      }
    }, [
      t,
      contentState,
      emptyTitle,
      emptyDescription,
      openCreateFormHandler,
      isViewOnly,
      createButtonText,
      actualFilteredEmptyTitle,
      actualFilteredEmptyDescription,
      actualFilteredEmptyDraftTitle,
      actualFilteredEmptyDraftDescription,
      handleGoToDraft,
      handleGoToPublished,
      contents,
      contentType,
      hasNextPage,
      loadingMore,
      fetchNextPage,
      refetch,
    ]);

    return (
      <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
        <div className="flex justify-between">
          <div className="flex flex-col space-y-1">
            <h3 className="text-xl font-medium tracking-tight">{displayTitle}</h3>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {contentState !== 'loading' && contentState !== 'empty' && (
            <CreateButton
              onClick={openCreateFormHandler}
              disabled={isViewOnly}
              text={createButtonText}
              id={buttonId}
              className="flex-none"
            />
          )}
        </div>

        <Separator className="my-6" />

        {renderContent}

        {/* createContent's refetchQueries (['queryContent']) refreshes the
            list, and the form navigates to the new content on success — so the
            list page needs no onSubmit refetch. */}
        {createForm({ open, onOpenChange: setOpen })}
      </div>
    );
  },
);

ContentListLayout.displayName = 'ContentListLayout';
