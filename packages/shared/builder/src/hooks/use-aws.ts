import { useApolloClient } from '@apollo/client';
import { createPresignedUrl } from '@usertour-packages/gql';
import axios from 'axios';

export const useAws = () => {
  const client = useApolloClient();

  const getPresignedUrl = async (fileName: string, storageType = 'S3') => {
    const { data } = await client.mutate({
      mutation: createPresignedUrl,
      variables: {
        fileName,
        storageType,
      },
    });
    return data?.createPresignedUrl;
  };

  const upload = async (file: File): Promise<string> => {
    const fileName = file.name;
    const contentType = file.type;
    const { signedUrl, cdnUrl } = await getPresignedUrl(fileName);

    if (!signedUrl || !cdnUrl) {
      throw new Error('Unable to generate upload URL. Please try again later.');
    }

    await axios.put(signedUrl, file, {
      headers: { 'Content-Type': contentType },
    });

    return cdnUrl;
  };

  return { upload };
};
