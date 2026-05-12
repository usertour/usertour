import { UploadFunc, UploadRequestOption } from '../types/slate';

export const promiseUploadFunc = (
  options: UploadRequestOption,
  customUploadRequest?: UploadFunc,
  setPercent?: (p: number) => void,
) => {
  const { onProgress, onError, onSuccess } = options;
  return new Promise<{ url?: string }>((resolve, reject) => {
    const args = {
      ...options,
      onProgress: (e: { percent?: number }) => {
        onProgress?.(e);
        setPercent?.(e?.percent ?? 0);
      },
      onError: (e: Error, body?: any) => {
        reject(e);
        onError?.(e, body);
        setPercent?.(-1);
      },
      onSuccess: (body: any) => {
        onSuccess?.(body);
        setPercent?.(0);
        resolve(body);
      },
    };

    if (customUploadRequest) {
      customUploadRequest(args);
    } else {
      base64file(args);
    }
  });
};

export const base64file: UploadFunc = (option: UploadRequestOption) => {
  const reader: FileReader = new FileReader();
  reader.addEventListener(
    'load',
    () => {
      option.onSuccess?.({ url: reader.result as string });
    },
    false,
  );
  reader.readAsDataURL(option.file);
};
