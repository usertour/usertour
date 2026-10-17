import { useCreatePresignedUrlMutation } from '@usertour/data';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Upload a file to the configured storage through a presigned URL: the API
 * signs a PUT URL and names the CDN URL, the browser PUTs the file straight
 * to storage, and the CDN URL comes back. Imperative, for upload handlers.
 */
export const useUpload = () => {
  const { t } = useTranslation();
  const { invoke: createPresignedUrl } = useCreatePresignedUrlMutation();
  const upload = useCallback(
    async (file: File): Promise<string> => {
      const { signedUrl, cdnUrl } = (await createPresignedUrl(file.name)) ?? {};
      if (!signedUrl || !cdnUrl) {
        throw new Error(t('components.upload.generateUrlFailed'));
      }
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) {
        throw new Error(t('components.upload.uploadFailed'));
      }
      return cdnUrl;
    },
    [createPresignedUrl, t],
  );
  return { upload };
};
