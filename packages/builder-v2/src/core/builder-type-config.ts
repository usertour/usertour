import type { BuilderMode } from './builder-mode';

// One-abstraction-N-instantiations interface for the per-content-type
// editors. Each content type (Banner / Checklist / Launcher /
// ResourceCenter / Flow) supplies a config record; the shared
// useTypeEditor hook wires it into the Zustand store + Save FSM.
//
// TData    — the per-type shape stored in `currentVersion.data`
//            (BannerData, ChecklistData, etc.).
// TUIState — per-type UI cursor / selection state local to the
//            editor (e.g. RC's currentBlock / currentTabId, Checklist's
//            currentItem). Defaults to `undefined` for types with no
//            per-type UI buffer (Banner).
//
// PR η ships the scaffold. PR θ (Banner) is the first migration to
// validate the API; later types may force interface adjustments.
// Sidebar / Preview component slots + validation rules can join the
// config later — start narrow, grow when a concrete migration
// demands it.

export interface BuilderTypeConfig<TData, TUIState = undefined> {
  /** Which BuilderMode this config handles. */
  mode: BuilderMode;
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
