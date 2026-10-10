import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  InMemoryCache,
  Observable,
  type TypedDocumentNode,
  gql,
} from '@apollo/client';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryErrorNotifierProvider } from '../notifier';
import { NOTIFIES_OWN_FAILURES, useTypedQuery } from '../use-typed-query';

type PingQuery = { ping: { id: string; value: string } | null };
const PingDocument = gql`
  query ping {
    ping {
      id
      value
    }
  }
` as TypedDocumentNode<PingQuery, Record<string, never>>;

type Reply = {
  data?: unknown;
  errors?: { message: string; path?: string[] }[];
  networkError?: Error;
};

// Replies are a fixed sequence, or a function the test steers (so a polling
// test can hold a state as long as it needs instead of racing a timer).
const harness = (replies: Reply[] | (() => Reply)) => {
  let call = 0;
  let lastContext: Record<string, unknown> = {};
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        lastContext = operation.getContext();
        const reply =
          typeof replies === 'function' ? replies() : replies[Math.min(call, replies.length - 1)];
        call += 1;
        if (reply.networkError) {
          observer.error(reply.networkError);
          return;
        }
        observer.next(reply as never);
        observer.complete();
      }),
  );
  const client = new ApolloClient({ link, cache: new InMemoryCache() });
  const notify = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>
      <QueryErrorNotifierProvider notify={notify}>{children}</QueryErrorNotifierProvider>
    </ApolloProvider>
  );
  return { wrapper, notify, client, calls: () => call, lastContext: () => lastContext };
};

const ok = { data: { ping: { __typename: 'Ping', id: 'p1', value: 'pong' } } };
const partial = { data: { ping: null }, errors: [{ message: 'simulated outage', path: ['ping'] }] };

describe('useTypedQuery', () => {
  it('is loading until data arrives, then ready; a refetch is refreshing, not loading', async () => {
    const { wrapper } = harness([ok, ok]);
    const { result } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data?.ping?.value).toBe('pong'));
    expect(result.current.loading).toBe(false);

    const pending = result.current.refetch();
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    await pending;
    expect(result.current.loading).toBe(false);
    expect(result.current.data?.ping?.value).toBe('pong');
  });

  it('treats a partial response as an error by default, and notifies once', async () => {
    const { wrapper, notify } = harness([partial]);
    const { result, rerender } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.data).toBeUndefined();
    rerender();
    rerender();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].operationName).toBe('ping');
  });

  it('surfaces the failure again when the user refetches into it', async () => {
    const { wrapper, notify } = harness([partial, partial]);
    const { result } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(notify).toHaveBeenCalledTimes(1);

    await result.current.refetch().catch(() => undefined);
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(2));
  });

  it('surfaces a failing poll once, and again once it has recovered', async () => {
    let server: Reply = partial;
    const { wrapper, notify, calls } = harness(() => server);
    const { result } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(notify).toHaveBeenCalledTimes(1);

    // Still failing: however many polls go by, that is the one notice.
    result.current.startPolling(20);
    const seen = calls();
    await waitFor(() => expect(calls()).toBeGreaterThanOrEqual(seen + 3));
    expect(notify).toHaveBeenCalledTimes(1);

    server = ok;
    await waitFor(() => expect(result.current.data?.ping?.value).toBe('pong'));
    expect(notify).toHaveBeenCalledTimes(1);

    server = partial;
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(2));
    result.current.stopPolling();
  });

  it('marks its operations as notifying their own failures', async () => {
    const { wrapper, lastContext } = harness([ok]);
    const { result } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(lastContext()[NOTIFIES_OWN_FAILURES]).toBe(true);
  });

  it('surfaces a network failure once, and a failing poll no more than that', async () => {
    const { wrapper, notify, calls } = harness([{ networkError: new Error('Failed to fetch') }]);
    const { result } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.networkError).toBeTruthy();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].error.networkError).toBeTruthy();

    result.current.startPolling(20);
    await waitFor(() => expect(calls()).toBeGreaterThanOrEqual(3));
    expect(notify).toHaveBeenCalledTimes(1);
    result.current.stopPolling();
  });

  it('surfaces a failed fetchMore, which rejects without touching the query', async () => {
    const { wrapper, notify } = harness([ok, { networkError: new Error('Failed to fetch') }]);
    const { result } = renderHook(() => useTypedQuery(PingDocument), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    await expect(result.current.fetchMore({ variables: {} })).rejects.toBeDefined();
    expect(result.current.error).toBeUndefined();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].error.networkError).toBeTruthy();
  });

  it('does not notify when the caller renders the failure in place', async () => {
    const { wrapper, notify } = harness([partial]);
    const { result } = renderHook(() => useTypedQuery(PingDocument, { notifyOnError: false }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not notify when the caller took the failure over with onError', async () => {
    const { wrapper, notify } = harness([partial]);
    const onError = vi.fn();
    const { result } = renderHook(() => useTypedQuery(PingDocument, { onError }), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it("hands partial data on when the caller opts into errorPolicy 'all'", async () => {
    const { wrapper, notify } = harness([partial]);
    const { result } = renderHook(
      () => useTypedQuery(PingDocument, { errorPolicy: 'all', notifyOnError: false }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.data).toEqual({ ping: null });
    expect(notify).not.toHaveBeenCalled();
  });
});
