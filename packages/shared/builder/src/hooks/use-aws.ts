import { useApolloClient } from "@apollo/client";
import { createPresignedUrl } from "@usertour-ui/gql";
import axios from "axios";

export const useAws = () => {
  const client = useApolloClient();
  const getPresignedUrl = async (
    fileName: string,
    storageType: string = "S3"
  ) => {
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
    try {
      const fileName = file.name;
      const contentType = file.type;
      const { signedUrl, cdnUrl } = await getPresignedUrl(fileName);

      if (!signedUrl || !cdnUrl) {
        throw new Error("Failed to get presigned URL");
      }

      await axios.put(signedUrl, file, {
        headers: { "Content-Type": contentType },
      });

      return cdnUrl;
    } catch (error) {
      // Log error for debugging
      console.error("Upload failed:", error);
      throw new Error("File upload failed");
    }
  };

  return { upload };
};
