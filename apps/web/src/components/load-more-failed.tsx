import { Button } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

export interface LoadMoreFailedProps {
  onRetry: () => unknown;
}

/**
 * The end of an infinite list whose next page failed. The sentinel is off
 * until the user asks again, so the list does not retry on its own.
 */
export const LoadMoreFailed = (props: LoadMoreFailedProps) => {
  const { onRetry } = props;
  const { t } = useTranslation('ui');
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      {t('common.loadMoreFailed')}
      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onRetry}>
        {t('appError.retry')}
      </Button>
    </span>
  );
};

LoadMoreFailed.displayName = 'LoadMoreFailed';
