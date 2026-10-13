import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import type { Pagination } from '@usertour/types';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  type BizModelFieldsFragment,
  type BizOrder,
  type BizUserFieldsFragment,
  DeleteBizCompanyDocument,
  DeleteBizUserDocument,
  QueryBizCompanyDocument,
  type QueryBizCompanyQuery,
  type QueryBizCompanyQueryVariables,
  QueryBizUserDocument,
  type QueryBizUserQuery,
  type QueryBizUserQueryVariables,
} from '../graphql';

// Domain wrappers for `biz.graphql`: the users and companies of an environment.

type UseCompanyListQueryProps = {
  query: {
    environmentId: string;
    [key: string]: any;
  };
  pagination?: Pagination;
  orderBy?: BizOrder;
};

export const useCompanyListQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseCompanyListQueryProps & {
  options?: TypedQueryOptions<QueryBizCompanyQuery, QueryBizCompanyQueryVariables>;
}) => {
  // See `useContentListQuery` — `...options` first, `variables` last,
  // so caller can't accidentally clobber wrapper-composed variables.
  const { data, refetch, loading, refreshing, error, networkStatus } = useTypedQuery(
    QueryBizCompanyDocument,
    {
      ...options,
      variables: {
        ...pagination,
        query,
        orderBy,
      },
    },
  );

  const bizCompanyList = data?.queryBizCompany;
  const contents = bizCompanyList?.edges?.map((edge) => ({ ...edge.node })) ?? [];
  const pageInfo = bizCompanyList?.pageInfo;
  const totalCount = bizCompanyList?.totalCount || 0;

  // networkStatus pass-through so callers can derive `isRefetching`
  // (NetworkStatus.refetch === 4). Opt-in: callers pass
  // `options.notifyOnNetworkStatusChange: true` to make it meaningful.
  // `loading` is the in-flight flag: the tables and reload buttons behind
  // this list gate on it, and a reload keeps the rows while it runs.
  return {
    contents,
    pageInfo,
    totalCount,
    refetch,
    loading: loading || refreshing,
    error,
    networkStatus,
  };
};

type UseUserListQueryProps = {
  query: {
    environmentId: string;
    [key: string]: any;
  };
  pagination?: Pagination;
  orderBy?: BizOrder;
};

/** A user as the user list returns it (the `BizUserFields` fragment). */
export type BizUser = BizUserFieldsFragment;

/** A user's membership of a company, as the user list returns it. */
export type BizUserOnCompany = NonNullable<BizUser['bizUsersOnCompany']>[number];

/** A company as the company list returns it (the `BizModelFields` fragment; companies are `BizModel` on the wire). */
export type BizCompany = BizModelFieldsFragment;

export const useUserListQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseUserListQueryProps & {
  options?: TypedQueryOptions<QueryBizUserQuery, QueryBizUserQueryVariables>;
}) => {
  // See `useContentListQuery` — `...options` first, `variables` last,
  // so caller can't accidentally clobber wrapper-composed variables.
  const { data, refetch, loading, refreshing, error, networkStatus } = useTypedQuery(
    QueryBizUserDocument,
    {
      ...options,
      variables: {
        ...pagination,
        query,
        orderBy,
      },
    },
  );

  const bizUserList = data?.queryBizUser;
  // The attributes are spread next to the entity fields as they always were;
  // the table reads them from `data`, so nothing reads the spread copies.
  const contents: BizUser[] =
    bizUserList?.edges?.map((edge) => ({ ...edge.node, ...edge.node.data })) ?? [];
  const pageInfo = bizUserList?.pageInfo;
  const totalCount = bizUserList?.totalCount || 0;

  // See useCompanyListQuery — same networkStatus opt-in pattern, same
  // in-flight `loading`.
  return {
    contents,
    pageInfo,
    totalCount,
    refetch,
    loading: loading || refreshing,
    error,
    networkStatus,
  };
};

export const useDeleteBizUserMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteBizUserDocument);
  const invoke = useCallback(
    async (data: {
      ids: string[];
      environmentId: string;
    }): Promise<{
      success: boolean;
      count: number;
    }> => {
      const response = await mutation({
        variables: { data },
        // Evict the BizUser entity from any cache slice that holds it.
        // The user list (useBizListCursor) runs on the global no-cache
        // default, so list refresh after delete still comes from the
        // caller's existing refetch chain; this evict targets the
        // cache-and-network detail-content queries
        // (`user-detail-content` / `user-session-detail-content`) so a
        // deleted user disappears from those slices too.
        update(cache) {
          for (const id of data.ids) {
            cache.evict({ id: cache.identify({ __typename: 'BizUser', id }) });
          }
          cache.gc();
        },
      });
      return {
        success: !!response.data?.deleteBizUser?.success,
        count: response.data?.deleteBizUser?.count ?? 0,
      };
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteBizCompanyMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteBizCompanyDocument);
  const invoke = useCallback(
    async (data: {
      ids: string[];
      environmentId: string;
    }): Promise<{ success: boolean; count: number }> => {
      const response = await mutation({
        variables: { data },
        // QueryBizCompanyDocument returns BizConnection (paginated BizModel),
        // not BizCompany — companies are stored under `BizModel:{id}` in
        // the normalized cache. (Users use `BizUser`, the subclass.)
        //
        // Same scope as deleteBizUser's evict: the company list runs
        // no-cache, so list refresh after delete comes from the caller's
        // explicit refetch; this evict targets the cache-and-network
        // company-detail-content slice so the deleted entity disappears
        // there too.
        update(cache) {
          for (const id of data.ids) {
            cache.evict({ id: cache.identify({ __typename: 'BizModel', id }) });
          }
          cache.gc();
        },
      });
      return {
        success: !!response.data?.deleteBizCompany?.success,
        count: response.data?.deleteBizCompany?.count ?? 0,
      };
    },
    [mutation],
  );
  return { invoke, loading, error };
};
