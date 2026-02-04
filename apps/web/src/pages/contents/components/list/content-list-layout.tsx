import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { useAppContext } from '@/contexts/app-context';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Separator } from '@usertour-packages/separator';
import { EmptyPlaceholder } from '@/components/molecules/segment/ui';
import { ArrowRightIcon } from '@usertour-packages/icons';
import { useContentCount } from '@usertour-packages/shared-hooks';
import { getQueryType } from '@/utils/content';
import { DataTable } from './data-table';
import { useState, useCallback, useMemo, ReactNode, memo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ContentListLayoutProps {
  title: string;
  description: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  createButtonText: string;
  createForm: (props: { isOpen: boolean; onClose: () => void }) => ReactNode;
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
  <Button onClick={onClick} className={className} id={id} disabled={disabled}>
    <PlusCircledIcon className="mr-2 h-4 w-4" />
    {text}
  </Button>
));

CreateButton.displayName = 'CreateButton';

// Content state type for switch-based rendering
type ContentState = 'loading' | 'empty' | 'filteredEmpty' | 'filteredEmptyDraft' | 'data';

export const ContentListLayout = memo(
  ({
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
    const { isViewOnly, environment } = useAppContext();
    const { contents, refetch, isLoading, contentType } = useContentListContext();

    // Derive from URL so draft count is fetched on first paint when visiting ?published=1
    // (context query may sync from URL in useEffect, causing one render where query.published is stale)
    const isPublishedView = searchParams.get('published') === '1';

    // Only fetch draft count when in Published view to check if draft content exists
    const { totalCount: draftCount } = useContentCount({
      environmentId: environment?.id,
      type: getQueryType(contentType),
      published: false,
      skip: !isPublishedView, // Skip if not in Published view
    });

    const { totalCount: publishedCount } = useContentCount({
      environmentId: environment?.id,
      type: getQueryType(contentType),
      published: true,
      skip: isPublishedView, // Skip if in Published view
    });

    const openCreateFormHandler = useCallback(() => {
      setOpen(true);
    }, []);

    const handleOnClose = useCallback(() => {
      setOpen(false);
      refetch();
    }, [refetch]);

    const handleGoToDraft = useCallback(() => {
      setSearchParams({ published: '0' }, { replace: false });
    }, [setSearchParams]);

    // Compute content state once to avoid multiple conditional checks
    const contentLength = contents?.length ?? 0;
    const contentState = useMemo<ContentState>(() => {
      if (isLoading) return 'loading';
      if (contentLength === 0) {
        // In Published view with draft content = filtered empty
        if (isPublishedView && draftCount > 0) return 'filteredEmpty';
        if (!isPublishedView && publishedCount > 0) return 'filteredEmptyDraft';
        return 'empty';
      }
      return 'data';
    }, [isLoading, contentLength, isPublishedView, draftCount, publishedCount]);

    const hasContent = contentState === 'data';

    // Default filtered empty messages based on title
    const actualFilteredEmptyTitle = filteredEmptyTitle ?? `No published ${title.toLowerCase()}`;
    const actualFilteredEmptyDescription =
      filteredEmptyDescription ?? 'Content exists but none are published yet.';
    const actualFilteredEmptyDraftTitle =
      filteredEmptyDraftTitle ?? `No draft ${title.toLowerCase()}`;
    const actualFilteredEmptyDraftDescription =
      filteredEmptyDraftDescription ?? 'Content exists but no drafts are available.';

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
                Go to Draft
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
                Go to Published
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </EmptyPlaceholder>
          );
        case 'data':
          return <DataTable />;
      }
    }, [
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
    ]);

    return (
      <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
        <div className="flex justify-between">
          <div className="flex flex-col space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {hasContent && (
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

        {createForm({ isOpen: open, onClose: handleOnClose })}
      </div>
    );
  },
);

ContentListLayout.displayName = 'ContentListLayout';
