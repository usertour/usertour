import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';
import { Button } from '@usertour/ui';
import { isStaleChunkError, reloadForStaleChunkOnce } from '@/utils/stale-chunk';

// Router-level error boundary. Replaces React Router's raw "Unexpected
// Application Error!" page: a stale-chunk error after a deploy auto-reloads to
// pull the fresh assets; anything else shows a calm reload prompt.
export const RouteErrorBoundary = () => {
  const { t } = useTranslation('ui');
  const error = useRouteError();
  const isStale = isStaleChunkError(error);

  // A new version was deployed under this still-running build — reload to fetch
  // it. If the one-shot guard already burned this run's reload, fall through to
  // the manual prompt below.
  useEffect(() => {
    if (isStale) {
      reloadForStaleChunkOnce();
    }
  }, [isStale]);

  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        {isStale
          ? t('appError.updating', { defaultValue: 'Updating to the latest version…' })
          : t('appError.description', {
              defaultValue: 'Something went wrong. Reloading usually fixes it.',
            })}
      </p>
      <Button type="button" onClick={() => window.location.reload()}>
        {t('appError.reload', { defaultValue: 'Reload' })}
      </Button>
    </div>
  );
};

RouteErrorBoundary.displayName = 'RouteErrorBoundary';
