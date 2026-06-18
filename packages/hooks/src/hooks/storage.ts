import { useApolloClient } from '@apollo/client';
import { createPresignedUrl } from '@usertour/gql';

// Presigned-URL upload. getPresignedUrl asks the API (createPresignedUrl
// mutation) for a signed S3 PUT URL + its CDN URL, then PUTs the file straight
// to storage. Imperative (called from upload handlers), so it uses the Apollo
// client directly rather than a render-time useMutation.
export const useAws = () => {
  const client = useApolloClient();

  const getPresignedUrl = async (fileName: string, storageType = 'S3') => {
    const { data } = await client.mutate({
      mutation: createPresignedUrl,
      variables: { fileName, storageType },
    });
    return data?.createPresignedUrl;
  };

  const upload = async (file: File): Promise<string> => {
    const { signedUrl, cdnUrl } = (await getPresignedUrl(file.name)) ?? {};
    if (!signedUrl || !cdnUrl) {
      throw new Error('Unable to generate upload URL. Please try again later.');
    }
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok) {
      throw new Error('Upload failed. Please try again later.');
    }
    return cdnUrl;
  };

  return { upload };
};
