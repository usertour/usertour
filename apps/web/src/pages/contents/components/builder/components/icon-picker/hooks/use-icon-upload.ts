import { useCallback, useState } from 'react';
import { useToast } from '@usertour/ui';
import { useAws } from '@usertour/hooks';
import { useTranslation } from 'react-i18next';
import type { RcUploadOption } from '@/pages/contents/components/builder/components/icon-picker/types';

interface UseIconUploadProps {
  onUploadSuccess: (url: string) => void;
}

export const useIconUpload = ({ onUploadSuccess }: UseIconUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { upload } = useAws();
  const { t } = useTranslation();

  const handleUpload = useCallback(
    (option: RcUploadOption) => {
      setIsUploading(true);

      // Extract file from rc-upload option (file can be File | Blob | string)
      const file = option.file;
      if (!(file instanceof File)) {
        const error = new Error('Invalid file type');
        toast({ variant: 'destructive', title: t('contentBuilder.iconPicker.invalidFile') });
        option.onError?.(error);
        setIsUploading(false);
        return;
      }

      // Handle async upload operations
      const processUpload = async () => {
        try {
          let url = '';

          // Try AWS upload first, fallback to base64
          try {
            url = await upload(file);
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
            toast({ variant: 'destructive', title: t('contentBuilder.iconPicker.uploadFailed') });
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

      // Start async processing without returning a promise
      processUpload();
    },
    [onUploadSuccess, upload, toast, t],
  );

  return { handleUpload, isUploading };
};
