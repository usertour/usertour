// One-abstraction-N-instantiations interface for the per-content-type
// editors. Each data-blob content type (Banner / Checklist / Launcher /
// ResourceCenter) supplies a config record; the shared useTypeEditor hook
// wires it into the Zustand store + Save FSM. (Flow has no config — it edits
// currentVersion.steps via its own useFlowEditor, not useTypeEditor.)
//
// TData    — the per-type shape stored in `currentVersion.data`
//            (BannerData, ChecklistData, etc.).
// TUIState — per-type UI cursor / selection state local to the editor (e.g.
//            RC's currentBlock / editingTab, Checklist's currentItem).
//            Defaults to `undefined` for types with no per-type UI buffer
//            (Banner).

export interface BuilderTypeConfig<TData, TUIState = undefined> {
  /** Fallback data shape when `currentVersion.data` is empty. */
  defaultData: TData;
  /** Optional shape normalization for freshly-loaded server data
   *  (handles missing fields, legacy renames, sentinel fallbacks
   *  like Banner's empty-contents case). Defaults to identity. */
  normalize?: (raw: TData | undefined) => TData;
  /** Initial per-type UI state (cursor, selected sub-item, draft
   *  buffers). Omit for types with no per-type UI buffer. */
  defaultUIState?: TUIState;
}
