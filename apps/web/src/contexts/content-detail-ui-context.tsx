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
//   and disable destructive actions. Composed of three signals:
//   - `savingCount` — a ref-count of in-flight writes (data / theme /
//     scheduledAt / config). A ref-count, not a bool: several can overlap and a
//     bool would let one write's completion clear another's still-pending save.
//   - `dataPending` / `configPending` — the buffered ~500ms debounce window
//     before a data / config write fires. Held separately (per concern) so a
//     config edit's cancel can't clear a pending data save, and vice versa.
//   isSaving is their OR, so both the buffered window and any in-flight write
//   gate publish.
//
// Genuine cross-component UI state. Distinct from server data (which
// goes through the `useContentDetail` / `useContentVersion` hooks).
export interface ContentDetailUIContextValue {
  contentId: string;
  contentType: ContentTypeName | undefined;
  isSaving: boolean;
  beginSaving: () => void;
  endSaving: () => void;
  setDataPending: (next: boolean) => void;
  setConfigPending: (next: boolean) => void;
}

const ContentDetailUIContext = createContext<ContentDetailUIContextValue | undefined>(undefined);

export interface ContentDetailUIProviderProps {
  children: ReactNode;
  contentId: string;
  contentType: ContentTypeName | undefined;
}

export const ContentDetailUIProvider = (props: ContentDetailUIProviderProps): JSX.Element => {
  const { children, contentId, contentType } = props;
  // In-flight writes (data / theme / scheduledAt / config). Ref-count, not a
  // bool: several can overlap and a bool would let one's completion clear
  // another's still-pending save. Only drops once every write has settled.
  const [savingCount, setSavingCount] = useState(0);
  // Buffered ~500ms debounce windows before a data / config write fires. Held
  // per concern so one's cancel/settle can't clear the other's pending flag.
  const [dataPending, setDataPending] = useState(false);
  const [configPending, setConfigPending] = useState(false);
  const isSaving = savingCount > 0 || dataPending || configPending;

  const beginSaving = useCallback(() => setSavingCount((count) => count + 1), []);
  const endSaving = useCallback(() => setSavingCount((count) => Math.max(0, count - 1)), []);

  const value = useMemo<ContentDetailUIContextValue>(
    () => ({
      contentId,
      contentType,
      isSaving,
      beginSaving,
      endSaving,
      setDataPending,
      setConfigPending,
    }),
    [contentId, contentType, isSaving, beginSaving, endSaving],
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
