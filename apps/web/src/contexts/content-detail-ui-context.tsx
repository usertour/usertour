import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ContentTypeName } from '@usertour/types';

// Coordinated UI state for the content-detail page tree.
//
// * `contentId` / `contentType` — URL-derived identifiers seeded by the
//   page entry (`content-detail-view`, `localization.tsx`). Lives here
//   so deep children don't each call `useParams()`. They drive the
//   `useContentDetail(contentId)` / `useContentVersion(content?.editedVersionId)`
//   hook calls that fetch server data.
// * `isSaving` — the save indicator. `use-content-version-update` raises it
//   around save mutations; the header reads it to render the "Saving…" badge
//   and disable destructive actions. Two concerns feed it: the `data` family
//   (debounced data write + immediate theme / scheduledAt writes) is a
//   ref-count via begin/endSavingData — the three can overlap, so a single
//   bool would let one's completion clear another's still-pending save; the
//   `config` targeting write stays a bool with its own cancel. Exposed as
//   their OR, so neither concern can clear the other's pending save.
//
// Genuine cross-component UI state. Distinct from server data (which
// goes through the `useContentDetail` / `useContentVersion` hooks).
export interface ContentDetailUIContextValue {
  contentId: string;
  contentType: ContentTypeName | undefined;
  isSaving: boolean;
  beginSavingData: () => void;
  endSavingData: () => void;
  setIsSavingConfig: (next: boolean) => void;
}

const ContentDetailUIContext = createContext<ContentDetailUIContextValue | undefined>(undefined);

export interface ContentDetailUIProviderProps {
  children: ReactNode;
  contentId: string;
  contentType: ContentTypeName | undefined;
}

export const ContentDetailUIProvider = (props: ContentDetailUIProviderProps): JSX.Element => {
  const { children, contentId, contentType } = props;
  // Ref-count of outstanding data-family save obligations (debounced data write
  // + immediate theme / scheduledAt writes). A bool can't model overlap: one
  // operation finishing would clear another's still-pending save. isSaving only
  // drops once every obligation has settled.
  const [savingDataCount, setSavingDataCount] = useState(0);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const isSaving = savingDataCount > 0 || isSavingConfig;

  const beginSavingData = useCallback(() => setSavingDataCount((count) => count + 1), []);
  const endSavingData = useCallback(
    () => setSavingDataCount((count) => Math.max(0, count - 1)),
    [],
  );

  const value = useMemo<ContentDetailUIContextValue>(
    () => ({
      contentId,
      contentType,
      isSaving,
      beginSavingData,
      endSavingData,
      setIsSavingConfig,
    }),
    [contentId, contentType, isSaving, beginSavingData, endSavingData],
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
