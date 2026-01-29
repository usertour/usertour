// Custom hook for handling image upload logic

import { useToast } from '@usertour-packages/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback, useState } from 'react';

import type { ContentEditorUploadRequestOption } from '../../types/editor';
import { promiseUploadFunc } from '../../utils/promiseUploadFunc';

export interface UseImageUploadOptions {
  customUploadRequest?: (file: File) => Promise<string>;
  onSuccess: (url: string) => void;
}

export interface UseImageUploadReturn {
  upload: (option: ContentEditorUploadRequestOption) => Promise<void>;
  isLoading: boolean;
}

export const useImageUpload = ({
  customUploadRequest,
  onSuccess,
}: UseImageUploadOptions): UseImageUploadReturn => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const upload = useCallback(
    async (option: ContentEditorUploadRequestOption) => {
      setIsLoading(true);
      try {
        let url = '';

        if (customUploadRequest) {
          url = await customUploadRequest(option.file as File);
        } else {
          const ret = await promiseUploadFunc({
            onProgress: option.onProgress,
            onError: option.onError,
            onSuccess: option.onSuccess,
            file: option.file as File,
          });
          if (ret?.url) {
            url = ret.url;
          }
        }

        if (url) {
          onSuccess(url);
        } else {
          toast({ variant: 'destructive', title: 'Failed to upload image' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: getErrorMessage(err) });
      } finally {
        setIsLoading(false);
      }
    },
    [customUploadRequest, onSuccess, toast],
  );

  return { upload, isLoading };
};
