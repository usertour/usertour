import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { CreatePresignedUrlDocument } from '../graphql';

/** A signed PUT URL for one file in the configured storage, with the CDN URL the file will have. */
export const useCreatePresignedUrlMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreatePresignedUrlDocument);
  const invoke = useCallback(
    async (fileName: string, storageType = 'S3') => {
      const response = await mutation({ variables: { fileName, storageType } });
      return response.data?.createPresignedUrl;
    },
    [mutation],
  );
  return { invoke, loading, error };
};
