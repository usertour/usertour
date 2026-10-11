import { getErrorMessage } from '@usertour/helpers';
import { type QueryFailure, QueryErrorNotifierProvider } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { onNetworkFailure } from './network-errors';

// The same operation failing again within this window (a page that mounts
// three observers of one query, a reconnect storm) is one notice, not three.
const DEDUPE_WINDOW_MS = 5_000;
const NETWORK_KEY = '$network';

export interface QueryErrorNotifierProps {
  children: ReactNode;
}

// How this application shows a failed query (ADR 0021 §2): one destructive
// toast carrying the server's message, de-duplicated per operation. Pages
// that render a failure in place opt out at the query (`notifyOnError: false`).
// A network failure is one notice for every operation the outage took down,
// whether a watched query reported it or the error link did for a mutation.
export const QueryErrorNotifier = (props: QueryErrorNotifierProps) => {
  const { children } = props;
  const { toast } = useToast();
  const { t } = useTranslation('ui');
  const lastShown = useRef(new Map<string, number>());

  const shownRecently = useCallback((key: string): boolean => {
    const now = Date.now();
    const last = lastShown.current.get(key) ?? 0;
    if (now - last < DEDUPE_WINDOW_MS) {
      return true;
    }
    lastShown.current.set(key, now);
    return false;
  }, []);

  const showNetworkFailure = useCallback(() => {
    if (shownRecently(NETWORK_KEY)) {
      return;
    }
    toast({
      variant: 'destructive',
      title: t('appError.network.title'),
      description: t('appError.network.description'),
    });
  }, [shownRecently, toast, t]);

  const notify = useCallback(
    (failure: QueryFailure) => {
      if (failure.error.networkError) {
        showNetworkFailure();
        return;
      }
      if (shownRecently(failure.operationName)) {
        return;
      }
      toast({
        variant: 'destructive',
        title: t('queryError.title'),
        description: getErrorMessage(failure.error),
      });
    },
    [showNetworkFailure, shownRecently, toast, t],
  );

  useEffect(() => onNetworkFailure(showNetworkFailure), [showNetworkFailure]);

  return <QueryErrorNotifierProvider notify={notify}>{children}</QueryErrorNotifierProvider>;
};

QueryErrorNotifier.displayName = 'QueryErrorNotifier';
