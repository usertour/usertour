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
import { useTypedQuery } from '../use-typed-query';

type PingQuery = { ping: { id: string; value: string } | null };
const PingDocument = gql`
  query ping {
    ping {
      id
      value
    }
  }
` as TypedDocumentNode<PingQuery, Record<string, never>>;

type Reply = { data?: unknown; errors?: { message: string; path?: string[] }[] };

const harness = (replies: Reply[]) => {
  let call = 0;
  const link = new ApolloLink(
    () =>
      new Observable((observer) => {
        const reply = replies[Math.min(call, replies.length - 1)];
        call += 1;
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
  return { wrapper, notify, client };
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
