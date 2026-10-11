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
   * What surrounds the card. `backdrop`: the auth backdrop, for states that
   * stand in for the whole shell (no environment, the builder's content).
   * `region`: centred in the shell region it replaces. `card`: the card alone,
   * for a layout that already frames its content (the auth layout).
   */
  frame?: 'backdrop' | 'region' | 'card';
}

/**
 * The in-place error state for a query whose empty state would be an action
 * or whose data the shell cannot draw without (ADR 0021 §5). Unknown is not
 * none: nothing here redirects, and nothing offers to create.
 */
export const Unavailable = (props: UnavailableProps) => {
  const { title, description, onRetry, frame = 'region' } = props;
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

  if (frame === 'backdrop') {
    return <AuthBackdrop>{card}</AuthBackdrop>;
  }
  if (frame === 'card') {
    return card;
  }
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-[480px]">{card}</div>
    </div>
  );
};

Unavailable.displayName = 'Unavailable';
