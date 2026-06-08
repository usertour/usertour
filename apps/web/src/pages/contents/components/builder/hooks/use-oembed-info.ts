import { useCallback } from 'react';
import { useQueryOembedInfoLazyQuery } from '@usertour/hooks';
import type { ContentOmbedInfo } from '@usertour/types';

// Builder's oembed resolver, passed to ContentEditor's `getOembedInfo` prop.
// Wraps the shared useQueryOembedInfoLazyQuery with the empty fallback the
// editor expects. Previously copy-pasted (with a raw useLazyQuery) into
// content-popper / content-bubble / content-modal.
const EMPTY_OEMBED: ContentOmbedInfo = { html: '', width: 0, height: 0 };

export const useOembedInfo = () => {
  const { invoke } = useQueryOembedInfoLazyQuery();
  return useCallback(
    async (url: string): Promise<ContentOmbedInfo> => {
      const info = await invoke(url);
      return info ?? EMPTY_OEMBED;
    },
    [invoke],
  );
};
