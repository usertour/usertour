import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ContentTypeName } from '@usertour/types';

// Coordinated UI state for the content-detail page tree.
//
// * `contentId` / `contentType` — URL-derived identifiers seeded by the
//   page entry (`content-detail-view`, `localization.tsx`). Lives here
//   so deep children don't each call `useParams()`. They drive the
//   `useContentDetail(contentId)` / `useContentVersion(content?.editedVersionId)`
//   hook calls that fetch server data.
// * `isSaving` — the debounced-save indicator. `use-content-version-update`
//   flips it true/false around the save mutation; the header reads it
//   to render the "Saving…" badge and disable destructive actions.
//
// Genuine cross-component UI state. Distinct from server data (which
// goes through the `useContentDetail` / `useContentVersion` hooks).
export interface ContentDetailUIContextValue {
  contentId: string;
  contentType: ContentTypeName | undefined;
  isSaving: boolean;
  setIsSaving: (next: boolean) => void;
}

const ContentDetailUIContext = createContext<ContentDetailUIContextValue | undefined>(undefined);

export interface ContentDetailUIProviderProps {
  children: ReactNode;
  contentId: string;
  contentType: ContentTypeName | undefined;
}

export const ContentDetailUIProvider = (props: ContentDetailUIProviderProps): JSX.Element => {
  const { children, contentId, contentType } = props;
  const [isSaving, setIsSaving] = useState(false);

  const value = useMemo<ContentDetailUIContextValue>(
    () => ({ contentId, contentType, isSaving, setIsSaving }),
    [contentId, contentType, isSaving],
  );

  return (
    <ContentDetailUIContext.Provider value={value}>{children}</ContentDetailUIContext.Provider>
  );
};

export const useContentDetailUI = (): ContentDetailUIContextValue => {
  const context = useContext(ContentDetailUIContext);
  if (!context) {
    throw new Error('useContentDetailUI must be used within a ContentDetailUIProvider.');
  }
  return context;
};
