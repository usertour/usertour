import { LoadingButton } from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthCard } from '@/pages/authentication/components/auth-card';
import { AuthBackdrop } from '@/pages/layouts/auth';

export interface UnavailableProps {
  title: string;
  description: string;
  /** Re-run the query that failed. The view stays up until it answers. */
  onRetry: () => unknown;
  /**
   * Draw the auth backdrop around the card: for states that stand in for the
   * whole shell (no project, no environment, the builder's content). Inside
   * the shell the card is centred in the region it replaces.
   */
  backdrop?: boolean;
}

/**
 * The in-place error state for a query whose empty state would be an action
 * or whose data the shell cannot draw without (ADR 0021 §5). Unknown is not
 * none: nothing here redirects, and nothing offers to create.
 */
export const Unavailable = (props: UnavailableProps) => {
  const { title, description, onRetry, backdrop = false } = props;
  const { t } = useTranslation('ui');
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      // The query state carries the outcome; a failed retry leaves this view up.
    } finally {
      setRetrying(false);
    }
  };

  const card = (
    <AuthCard
      title={title}
      description={description}
      footer={
        <LoadingButton type="button" className="w-full" loading={retrying} onClick={retry}>
          {t('appError.retry')}
        </LoadingButton>
      }
    />
  );

  if (backdrop) {
    return <AuthBackdrop>{card}</AuthBackdrop>;
  }
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-[480px]">{card}</div>
    </div>
  );
};

Unavailable.displayName = 'Unavailable';
