import { ContentDetailUIProvider } from '@/contexts/content-detail-ui-context';
import { NotFound } from '@/routes/not-found';
import { ContentTypeName } from '@usertour/types';
import { useParams } from 'react-router-dom';
import { ContentDetailHeader } from './components/detail/components/content-detail-header';
import { ContentLocalizationDetail } from './components/detail/tabs/localization/content-localization-detail';

export const ContentLocalization = () => {
  const { contentId, contentType, locateCode } = useParams();
  if (!contentId || !locateCode) {
    return <NotFound />;
  }

  return (
    <ContentDetailUIProvider
      contentId={contentId}
      contentType={contentType as ContentTypeName | undefined}
    >
      {/* AdminShellMuted's content card uses `flex h-full w-full`
          (default flex-row) for its inner sidebar-wrapper, so the header
          + body need an explicit flex-col container or they end up
          side-by-side. Same fix as ContentDetailViewInner. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <ContentDetailHeader />
        <ContentLocalizationDetail locateCode={locateCode} />
      </div>
    </ContentDetailUIProvider>
  );
};

ContentLocalization.displayName = 'ContentLocalization';
