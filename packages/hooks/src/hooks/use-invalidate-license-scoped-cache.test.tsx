import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  InMemoryCache,
  Observable,
} from '@apollo/client';
import { getUserInfo, globalConfig } from '@usertour/gql';
import { useInvalidateLicenseScopedCache } from './gql';

// Regression test for the bug class where mutating an admin-side license or
// instance-setting field did not invalidate `me` / `globalConfig` in the
// Apollo cache, leaving the route guard and /settings/account stuck on stale
// "feature disabled" state until a manual reload.
//
// Strategy: spy on the Apollo client's cache.evict / cache.gc / refetchQueries
// methods rather than seeding-then-asserting cache contents — Apollo's
// writeQuery validation produces noisy warnings when the seed shape doesn't
// match every selection, and we only care that the hook calls the right
// invalidation primitives.

const buildClient = () => {
  const cache = new InMemoryCache();
  const noopLink = new ApolloLink(
    () =>
      new Observable((subscriber) => {
        subscriber.next({ data: {} });
        subscriber.complete();
      }),
  );
  return new ApolloClient({ cache, link: noopLink });
};

const wrapper =
  (client: ApolloClient<unknown>) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(ApolloProvider, { client }, children);

describe('useInvalidateLicenseScopedCache', () => {
  // Apollo's real refetchQueries logs an invariant warning when it can't find
  // any active ObservableQuery for the requested document (which is expected
  // in these unit tests — we never mount a real consumer). Stub it everywhere
  // so we observe the call without the noise; one test below overrides this
  // stub to test the error-swallow branch.
  const stubRefetch = (client: ApolloClient<unknown>) =>
    vi.spyOn(client, 'refetchQueries').mockResolvedValue([] as any);

  it('evicts both `me` and `globalConfig` from the cache root', async () => {
    const client = buildClient();
    stubRefetch(client);
    const evictSpy = vi.spyOn(client.cache, 'evict');

    const { result } = renderHook(() => useInvalidateLicenseScopedCache(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current();
    });

    const evictedFields = evictSpy.mock.calls.map(
      ([arg]) => (arg as { fieldName: string }).fieldName,
    );
    expect(evictedFields).toEqual(expect.arrayContaining(['me', 'globalConfig']));
  });

  it('runs cache.gc after evicting so orphaned entries are reclaimed', async () => {
    const client = buildClient();
    stubRefetch(client);
    const gcSpy = vi.spyOn(client.cache, 'gc');

    const { result } = renderHook(() => useInvalidateLicenseScopedCache(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current();
    });

    expect(gcSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers refetchQueries for both me and globalConfig', async () => {
    const client = buildClient();
    const spy = stubRefetch(client);

    const { result } = renderHook(() => useInvalidateLicenseScopedCache(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current();
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const args = spy.mock.calls[0][0] as { include: unknown[] };
    expect(args.include).toEqual(expect.arrayContaining([getUserInfo, globalConfig]));
  });

  it('returns a stable function across renders (same Apollo client)', () => {
    const client = buildClient();
    stubRefetch(client);
    const { result, rerender } = renderHook(() => useInvalidateLicenseScopedCache(), {
      wrapper: wrapper(client),
    });

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('swallows refetch errors so a failing network does not crash the caller', async () => {
    const client = buildClient();
    vi.spyOn(client, 'refetchQueries').mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useInvalidateLicenseScopedCache(), {
      wrapper: wrapper(client),
    });

    await expect(
      act(async () => {
        await result.current();
      }),
    ).resolves.not.toThrow();
  });
});
