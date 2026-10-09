import { getErrorMessage } from '@usertour/helpers';
import { type QueryFailure, QueryErrorNotifierProvider } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { type ReactNode, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// The same operation failing again within this window (a page that mounts
// three observers of one query, a reconnect storm) is one notice, not three.
const DEDUPE_WINDOW_MS = 5_000;

export interface QueryErrorNotifierProps {
  children: ReactNode;
}

// How this application shows a failed query (ADR 0021 §2): one destructive
// toast carrying the server's message, de-duplicated per operation. Pages
// that render a failure in place opt out at the query (`notifyOnError: false`).
export const QueryErrorNotifier = (props: QueryErrorNotifierProps) => {
  const { children } = props;
  const { toast } = useToast();
  const { t } = useTranslation('ui');
  const lastShown = useRef(new Map<string, number>());

  const notify = useCallback(
    (failure: QueryFailure) => {
      const now = Date.now();
      const last = lastShown.current.get(failure.operationName) ?? 0;
      if (now - last < DEDUPE_WINDOW_MS) {
        return;
      }
      lastShown.current.set(failure.operationName, now);
      toast({
        variant: 'destructive',
        title: t('queryError.title'),
        description: getErrorMessage(failure.error),
      });
    },
    [toast, t],
  );

  return <QueryErrorNotifierProvider notify={notify}>{children}</QueryErrorNotifierProvider>;
};

QueryErrorNotifier.displayName = 'QueryErrorNotifier';
