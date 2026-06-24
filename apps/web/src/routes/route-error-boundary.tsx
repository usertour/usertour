import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { Button } from '@usertour/ui';
import { isStaleChunkError, reloadForStaleChunkOnce } from '@/utils/stale-chunk';

// Router-level error boundary. Replaces React Router's raw "Unexpected
// Application Error!" page: a stale-chunk error after a deploy auto-reloads to
// pull the fresh assets; anything else shows a calm reload prompt.
export const RouteErrorBoundary = () => {
  const { t } = useTranslation('ui');
  const error = useRouteError();
  const posthog = usePostHog();
  const isStale = isStaleChunkError(error);

  useEffect(() => {
    // A stale chunk is a deploy artifact, not a bug — reload to fetch the fresh
    // assets (one-shot guarded) and don't report it.
    if (isStale) {
      reloadForStaleChunkOnce();
      return;
    }
    // Report genuine crashes so they surface in PostHog instead of only via
    // user screenshots. React-router also hands us non-Error throws — only
    // forward real Errors.
    if (error instanceof Error) {
      posthog?.captureException(error);
    }
  }, [isStale, error, posthog]);

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
