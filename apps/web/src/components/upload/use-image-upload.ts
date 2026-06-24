import { useCallback, useState } from 'react';

import { useApolloClient } from '@apollo/client';
import { createPresignedUrl } from '@usertour/gql';
import { useToast } from '@usertour/ui';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

interface RcUploadOption {
  file: File | Blob | string;
  onProgress?: (event: { percent?: number }) => void;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
}

interface UseImageUploadProps {
  onUploadSuccess: (url: string) => void;
}

/**
 * Uploads an image to S3 via a presigned URL, falling back to an inline
 * base64 data URL when S3 isn't reachable. Shaped for rc-upload's
 * `customRequest`. Generic — no business knowledge; used by the shared
 * `ImageUploadWidget` and the theme avatar tab.
 */
export const useImageUpload = ({ onUploadSuccess }: UseImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
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
        throw new Error(t('components.upload.generateUrlFailed'));
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
        toast({ variant: 'destructive', title: t('components.upload.invalidFile') });
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
            toast({
              variant: 'destructive',
              title: t('components.upload.uploadFailed'),
            });
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
