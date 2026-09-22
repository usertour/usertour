/** A file to mint an upload URL for — what UtilitiesService.createPresignedUrl takes. */
export type PresignedUploadRequest = {
  fileName: string;
  contentType?: string;
  storageType: string;
};
