import { useLazyQuery } from '@apollo/client';
import type { ContentOmbedInfo, GlobalConfig } from '@usertour/types';
import { useCallback } from 'react';
import { useTypedQuery } from '../query';
import { GlobalConfigDocument, QueryOembedInfoDocument } from '../graphql';

// Domain wrappers for `utilities.graphql`: the deployment's public
// configuration and the oEmbed lookup the editor's embed block uses.

export const useGlobalConfigQuery = () => {
  const { data, loading, error } = useTypedQuery(GlobalConfigDocument);
  const globalConfig: GlobalConfig | undefined = data?.globalConfig;
  return { data: globalConfig, loading, error };
};

export const useQueryOembedInfoLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(QueryOembedInfoDocument);
  const invoke = useCallback(
    async (url: string): Promise<ContentOmbedInfo | undefined> => {
      const response = await query({ variables: { url } });
      return response.data?.queryOembedInfo;
    },
    [query],
  );
  return { invoke, loading, error };
};
