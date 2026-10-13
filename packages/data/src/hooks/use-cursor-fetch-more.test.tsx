import { NetworkStatus } from '@apollo/client';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type UseCursorFetchMoreArgs, useCursorFetchMore } from './use-cursor-fetch-more';

const listA = (after: string) => ({ query: 'A', after });
const listB = (after: string) => ({ query: 'B', after });

const args = (overrides: Partial<UseCursorFetchMoreArgs> = {}): UseCursorFetchMoreArgs => ({
  loading: false,
  networkStatus: NetworkStatus.ready,
  hasNextPage: true,
  endCursor: 'c1',
  fetchMore: vi.fn().mockResolvedValue({}),
  buildVariables: listA,
  ...overrides,
});

/** A fetchMore whose first call stays pending until the test settles it. */
const deferredOnce = () => {
  let reject: (reason: Error) => void = () => undefined;
  const fetchMore = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_, rejectPage) => {
          reject = rejectPage;
        }),
    )
    .mockResolvedValue({});
  return { fetchMore, fail: (reason: Error) => reject(reason) };
};

const render = (initial: UseCursorFetchMoreArgs) =>
  renderHook((props: UseCursorFetchMoreArgs) => useCursorFetchMore(props), {
    initialProps: initial,
  });

describe('useCursorFetchMore', () => {
  it('stops asking after a failed page until the user retries', async () => {
    const fetchMore = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({});
    const { result } = render(args({ fetchMore }));

    await act(() => result.current.fetchNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(1);
    expect(result.current.pageFailed).toBe(true);

    // The sentinel is still in view and asks again: nothing is sent.
    await act(() => result.current.fetchNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(1);

    await act(() => result.current.retryNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(2);
    expect(result.current.pageFailed).toBe(false);
  });

  it('sends the same page once when a reload completes while it is in flight', async () => {
    const { fetchMore, fail } = deferredOnce();
    const { result, rerender } = render(args({ fetchMore }));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.fetchNextPage();
    });
    rerender(args({ fetchMore, networkStatus: NetworkStatus.refetch, loading: true }));
    rerender(args({ fetchMore }));

    await act(() => result.current.fetchNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      fail(new Error('offline'));
      await pending;
    });
    expect(result.current.pageFailed).toBe(true);
  });

  it('sends one page at a time per list, even when a reload moved the cursor', async () => {
    const { fetchMore, fail } = deferredOnce();
    const { result, rerender } = render(args({ fetchMore }));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.fetchNextPage();
    });
    // A row was created: the reload leaves page one ending on a new cursor.
    rerender(args({ fetchMore, networkStatus: NetworkStatus.refetch, loading: true }));
    rerender(args({ fetchMore, endCursor: 'c1-after-insert' }));

    await act(() => result.current.fetchNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      fail(new Error('offline'));
      await pending;
    });
  });

  it('sends each page once when the user switches lists and back while pages are in flight', async () => {
    const { fetchMore, fail } = deferredOnce();
    const { result, rerender } = render(args({ fetchMore }));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.fetchNextPage();
    });

    // B: its own first page is not blocked by A's request in flight.
    rerender(args({ fetchMore, networkStatus: NetworkStatus.setVariables, loading: true }));
    rerender(args({ fetchMore, buildVariables: listB, endCursor: 'b1' }));
    expect(result.current.pageFailed).toBe(false);
    await act(() => result.current.fetchNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(2);
    expect(fetchMore.mock.calls[1][0]).toEqual({ variables: { query: 'B', after: 'b1' } });

    // Back to A: the same page is still in flight, so it is not sent again.
    rerender(args({ fetchMore, networkStatus: NetworkStatus.setVariables, loading: true }));
    rerender(args({ fetchMore }));
    await act(() => result.current.fetchNextPage());
    expect(fetchMore).toHaveBeenCalledTimes(2);

    // A's page fails late: it is A's failure, and A is on screen.
    await act(async () => {
      fail(new Error('offline'));
      await pending;
    });
    expect(result.current.pageFailed).toBe(true);
  });

  it('keeps a failure with its own list', async () => {
    const { fetchMore, fail } = deferredOnce();
    const { result, rerender } = render(args({ fetchMore }));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.fetchNextPage();
    });
    rerender(args({ fetchMore, networkStatus: NetworkStatus.setVariables, loading: true }));
    rerender(args({ fetchMore, buildVariables: listB, endCursor: 'b1' }));

    // A fails after the user has moved to B: B is not failed.
    await act(async () => {
      fail(new Error('offline'));
      await pending;
    });
    expect(result.current.pageFailed).toBe(false);

    // Back on A, that page is still the failed one.
    rerender(args({ fetchMore }));
    expect(result.current.pageFailed).toBe(true);
  });

  it('clears the failure when the variables change, even to a list with the same cursor', async () => {
    const fetchMore = vi.fn().mockRejectedValue(new Error('offline'));
    const { result, rerender } = render(args({ fetchMore }));
    await act(() => result.current.fetchNextPage());
    expect(result.current.pageFailed).toBe(true);

    rerender(args({ fetchMore, buildVariables: listB }));
    expect(result.current.pageFailed).toBe(false);
  });

  it('forgets the failure on a reload, and a new cursor is a different page', async () => {
    const fetchMore = vi.fn().mockRejectedValue(new Error('offline'));
    const { result, rerender } = render(args({ fetchMore }));
    await act(() => result.current.fetchNextPage());
    expect(result.current.pageFailed).toBe(true);

    rerender(args({ fetchMore, networkStatus: NetworkStatus.refetch, loading: true }));
    expect(result.current.pageFailed).toBe(false);

    rerender(args({ fetchMore }));
    await act(() => result.current.fetchNextPage());
    expect(result.current.pageFailed).toBe(true);

    rerender(args({ fetchMore, endCursor: 'c2' }));
    expect(result.current.pageFailed).toBe(false);
  });
});
