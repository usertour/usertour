import { EditableTitle } from '@/components/molecules/editable-title';
import { MoreButton } from '@/components/molecules/section-breadcrumb-header';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useContentBuilder } from '@/hooks/useContentBuilder';
import { useContentPublishState } from '@/hooks/use-content-publish-state';
import { useMutation } from '@apollo/client';
import { EnterIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { updateContent } from '@usertour-packages/gql';
import { PlaneIcon, RiArrowRightSLine, SpinnerIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { useToast } from '@usertour-packages/use-toast';
import { ContentDataType } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useEvent } from 'react-use';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ContentEditDropdownMenu } from '../shared/content-edit-dropmenu';
import { ContentPublishForm } from '../shared/content-publish-form';
import { getContentTypeMeta } from '../shared/content-type-meta';
import { ContentDetailHeaderSkeleton } from './content-detail-header-skeleton';

const TABS = [
  { key: 'analytics', href: '/analytics' },
  { key: 'content', href: '/detail' },
  { key: 'versions', href: '/versions' },
] as const;

interface MainNavProps {
  className?: string;
}

function MainNav({ className }: MainNavProps) {
  const { contentId } = useParams();
  const { environment } = useAppContext();
  const { contentType } = useContentDetailContext();
  const location = useLocation();
  const baseUrl = `/env/${environment?.id}/${contentType}/${contentId}`;
  const { t } = useTranslation();

  return (
    <nav className={cn('flex items-center gap-4 lg:gap-6', className)}>
      {TABS.map((tab) => {
        const href = baseUrl + tab.href;
        const active = location.pathname.includes(href);
        return (
          <Link
            key={tab.key}
            to={href}
            className={cn(
              // The active underline sits absolutely below the label so it
              // doesn't add to the Link's height — that lets the tabs share a
              // baseline with the breadcrumb (which is just plain text).
              'relative text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`contents.detail.tabs.${tab.key}`)}
            {active && (
              <span className="pointer-events-none absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Content detail header. Mirrors the user / company / session detail
// framework — sticky breadcrumb-style top bar inside AdminSubpageLayout's
// sidebar-visible shell — but keeps the rich right-side cluster (route
// tabs, autosaved status, Edit-In-Builder, Publish, More) that this entity
// type needs. Height runs taller than the simple SectionBreadcrumbHeader to
// fit the action cluster without crowding.
export const ContentDetailHeader = () => {
  const navigator = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { content, refetch, contentType, loading } = useContentDetailContext();
  const [openPublish, setOpenPublish] = useState(false);
  const { version, isSaving } = useContentVersionContext();
  const { environment, isViewOnly } = useAppContext();
  const { openBuilder } = useContentBuilder();
  const isPublishDisabled = useContentPublishState();
  const [, setSearchParams] = useSearchParams();
  const [updateContentMutation] = useMutation(updateContent);

  // Warn user when closing page while saving
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    if (isSaving) {
      e.preventDefault();
    }
  });

  if (loading) {
    return <ContentDetailHeaderSkeleton />;
  }

  if (!contentType || !content) {
    return null;
  }

  const handleBack = () => {
    navigator(`/env/${environment?.id}/${contentType}`);
    if (content.published) {
      setSearchParams({ published: '1' });
    }
  };

  const handleRename = async (name: string) => {
    try {
      await updateContentMutation({
        variables: { contentId: content.id, content: { name } },
      });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
      throw error;
    }
  };

  const showAutosaved = content.editedVersionId !== content.publishedVersionId && version;
  const showPublished =
    content.editedVersionId === content.publishedVersionId && content.publishedAt;
  const statusText = showAutosaved
    ? t('contents.detail.autosaved', {
        when: formatDistanceToNow(new Date(version.updatedAt)),
      })
    : showPublished
      ? t('contents.detail.published', {
          when: formatDistanceToNow(new Date(content.publishedAt as string)),
        })
      : null;

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background">
        <div className="flex h-14 w-full min-w-0 items-center gap-4 px-4">
          {/* Left: breadcrumb-style "<Type plural> ▸ <flow name>" with inline rename.
              The first segment uses the entity's content-type plural label
              (Flows / Checklists / Banners / etc.) so the breadcrumb tells the
              user which list they came from, and the back action goes to the
              matching list page. */}
          {/* max-w-sm caps how wide the editable title can grow before
              truncating — without it a long flow name swallows half the
              header before EditableTitle's inner truncate kicks in. */}
          <div className="flex min-w-0 max-w-sm items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSaving}
              className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground first-letter:uppercase disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getContentTypeMeta(content.type).plural}
            </button>
            <RiArrowRightSLine className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <EditableTitle
              value={content.name ?? ''}
              onRename={handleRename}
              disabled={isViewOnly}
            />
          </div>

          <MainNav className="ml-6" />

          {/* Right cluster: status + Edit In Builder + Publish + More */}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {isSaving ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                {t('contents.detail.saving')}
              </span>
            ) : (
              statusText && <span className="text-sm text-muted-foreground">{statusText}</span>
            )}
            {content.type !== ContentDataType.TRACKER && (
              <Button
                type="button"
                variant="outline"
                onClick={() => openBuilder(content, contentType)}
                disabled={isViewOnly || isSaving}
              >
                <EnterIcon className="mr-2" />
                {t('contents.detail.editInBuilder')}
              </Button>
            )}
            <Button disabled={isPublishDisabled} onClick={() => setOpenPublish(true)}>
              <PlaneIcon className="mr-1" width={20} height={20} />
              {t('contents.detail.publish')}
            </Button>
            <ContentEditDropdownMenu
              content={content}
              disabled={isViewOnly || isSaving}
              onSubmit={(action: string) => {
                if (action === 'delete') {
                  navigator(`/env/${environment?.id}/${contentType}`);
                } else {
                  refetch();
                }
              }}
            >
              <MoreButton aria-label={t('contents.detail.actionsMenu')} />
            </ContentEditDropdownMenu>
          </div>
        </div>
      </div>
      <ContentPublishForm
        versionId={content.editedVersionId || ''}
        open={openPublish}
        onOpenChange={setOpenPublish}
        onSubmit={async () => {
          setOpenPublish(false);
          await refetch();
        }}
      />
    </>
  );
};

ContentDetailHeader.displayName = 'ContentDetailHeader';
