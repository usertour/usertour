import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useContentBuilder } from '@/hooks/useContentBuilder';
import { ArrowLeftIcon, DotsHorizontalIcon, EnterIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { EditIcon, PlaneIcon, SpinnerIcon } from '@usertour-ui/icons';
import { cn } from '@usertour-ui/ui-utils';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ContentEditDropdownMenu } from '../shared/content-edit-dropmenu';
import { ContentPublishForm } from '../shared/content-publish-form';
import { ContentRenameForm } from '../shared/content-rename-form';

const navigations = [
  {
    name: 'Analytics',
    href: '/analytics',
  },
  {
    name: 'Content',
    href: '/detail',
  },
  // {
  //   name: "Localization",
  //   href: "/localization",
  // },
  {
    name: 'Versions',
    href: '/versions',
  },
];

function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { contentId } = useParams();
  const { environment } = useAppContext();
  const { contentType } = useContentDetailContext();
  const location = useLocation();
  const baseUrl = `/env/${environment?.id}/${contentType}/${contentId}`;

  const navs = navigations.map((nav) => {
    return { ...nav, href: baseUrl + nav.href };
  });
  return (
    <nav className={cn('flex items-center space-x-4 lg:space-x-6', className)} {...props}>
      {navs.map((nav, index) => (
        <Link
          to={nav.href}
          key={index}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            location.pathname.indexOf(nav.href) !== -1 ? '' : 'text-muted-foreground',
          )}
        >
          {nav.name}
        </Link>
      ))}
    </nav>
  );
}

export const ContentDetailHeader = () => {
  const navigator = useNavigate();
  const { content, refetch, contentType } = useContentDetailContext();
  const [openPublish, setOpenPublish] = useState(false);
  const { version, isSaveing } = useContentVersionContext();
  const { environment, isViewOnly } = useAppContext();
  const { openBuilder } = useContentBuilder();
  const [_, setSearchParams] = useSearchParams();
  if (!contentType || !content) return null;

  const isDisabled =
    (content.published && content.editedVersionId === content.publishedVersionId) || false;

  const handleBack = () => {
    navigator(`/env/${environment?.id}/${contentType}`);
    if (content.published) {
      setSearchParams({ published: '1' });
    }
  };

  return (
    <>
      <>
        <div className="border-b bg-white flex-col md:flex w-full fixed z-10 top-0">
          <div className="flex h-16 items-center px-4">
            <ArrowLeftIcon className="ml-4 h-6 w-8 cursor-pointer flex-none" onClick={handleBack} />
            <span className="flex-none max-w-40	truncate ...	">{content?.name}</span>
            <ContentRenameForm
              data={content}
              onSubmit={() => {
                refetch();
              }}
            >
              <Button variant={'ghost'} className="hover:bg-transparent" disabled={isViewOnly}>
                <EditIcon className="ml-1 cursor-pointer" width={16} height={16} />
              </Button>
            </ContentRenameForm>
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              {isSaveing && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {!isSaveing && (
                <div className="px-1 text-sm text-muted-foreground min-w-60 text-right">
                  {content.editedVersionId !== content.publishedVersionId && version && (
                    <>Autosaved {formatDistanceToNow(new Date(version?.updatedAt))} ago</>
                  )}
                  {content.editedVersionId === content.publishedVersionId &&
                    content.publishedAt && (
                      <>Published {formatDistanceToNow(new Date(content.publishedAt))} ago</>
                    )}
                </div>
              )}
              {/* <ContentOpenBuilder content={content} /> */}
              <Button
                type="button"
                variant={'outline'}
                onClick={() => openBuilder(content, contentType)}
                className="flex-none"
                disabled={isViewOnly}
              >
                <EnterIcon className="mr-2" />
                Edit In Builder
              </Button>
              <Button
                disabled={isDisabled || isViewOnly}
                onClick={() => {
                  setOpenPublish(true);
                }}
              >
                <PlaneIcon className="mr-1" width={20} height={20} />
                Publish
              </Button>
              {content && (
                <ContentEditDropdownMenu
                  content={content}
                  disabled={isViewOnly}
                  onSubmit={() => {
                    refetch();
                  }}
                >
                  <Button variant="secondary">
                    <span className="sr-only">Actions</span>
                    <DotsHorizontalIcon className="h-4 w-4" />
                  </Button>
                </ContentEditDropdownMenu>
              )}
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
    </>
  );
};

ContentDetailHeader.displayName = 'ContentDetailHeader';
