import { useCallback, useState } from 'react';

import { useApolloClient } from '@apollo/client';
import { createPresignedUrl } from '@usertour-packages/gql';
import { useToast } from '@usertour-packages/use-toast';
import axios from 'axios';

interface RcUploadOption {
  file: File | Blob | string;
  onProgress?: (event: { percent?: number }) => void;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
}

interface UseAvatarUploadProps {
  onUploadSuccess: (url: string) => void;
}

/**
 * Hook for handling avatar upload
 */
export const useAvatarUpload = ({ onUploadSuccess }: UseAvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const client = useApolloClient();

  // Upload to AWS S3
  const uploadToS3 = useCallback(
    async (file: File): Promise<string> => {
      const fileName = file.name;
      const contentType = file.type;

      const { data } = await client.mutate({
        mutation: createPresignedUrl,
        variables: {
          fileName,
          storageType: 'S3',
        },
      });

      const { signedUrl, cdnUrl } = data?.createPresignedUrl ?? {};

      if (!signedUrl || !cdnUrl) {
        throw new Error('Unable to generate upload URL. Please try again later.');
      }

      await axios.put(signedUrl, file, {
        headers: { 'Content-Type': contentType },
      });

      return cdnUrl;
    },
    [client],
  );

  const handleUpload = useCallback(
    (option: RcUploadOption) => {
      setIsUploading(true);

      const file = option.file;
      if (!(file instanceof File)) {
        const error = new Error('Invalid file type');
        toast({ variant: 'destructive', title: 'Please select a valid file' });
        option.onError?.(error);
        setIsUploading(false);
        return;
      }

      const processUpload = async () => {
        try {
          let url = '';

          // Try AWS upload first, fallback to base64
          try {
            url = await uploadToS3(file);
          } catch {
            // Fallback to base64 if AWS upload fails
            url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
            });
          }

          if (url) {
            option.onSuccess?.({ url });
            onUploadSuccess(url);
          } else {
            const error = new Error('Upload failed');
            toast({ variant: 'destructive', title: 'Failed to upload avatar' });
            option.onError?.(error);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Upload failed');
          toast({ variant: 'destructive', title: error.message });
          option.onError?.(error);
        } finally {
          setIsUploading(false);
        }
      };

      processUpload();
    },
    [onUploadSuccess, uploadToS3, toast],
  );

  return { handleUpload, isUploading };
};
