import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour/button';
import { ContentTypeName } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export interface ContentDetailNotFoundProps {
  contentType: ContentTypeName;
}

// Mirrors routes/not-found.tsx — server returns null for soft-deleted or
// inaccessible content, and downstream header/body components all assume a
// Content object, so without this fallback the page collapses to blank.
// ContentTypeName values are URL slugs ('flows', 'checklists', etc.) and
// map 1:1 to the list route.
export const ContentDetailNotFound = (props: ContentDetailNotFoundProps) => {
  const { contentType } = props;
  const { environment } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-card/60">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">{t('contents.notFound.description')}</p>
      {environment?.id && (
        <Button asChild>
          <Link to={`/env/${environment.id}/${contentType}`}>
            {t('contents.notFound.backButton')}
          </Link>
        </Button>
      )}
    </div>
  );
};

ContentDetailNotFound.displayName = 'ContentDetailNotFound';
