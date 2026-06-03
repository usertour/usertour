import type { Content, ContentVersion, Step, Theme } from '@usertour/types';
import { createStore } from 'zustand/vanilla';
import { enablePatches, produceWithPatches, applyPatches, setAutoFreeze, type Patch } from 'immer';

// immer's patch generation must be opted into globally. Cheap module-
// init side effect; idempotent across multiple imports.
enablePatches();
// Disable autoFreeze: V1 consumers mutate parts of currentVersion
// in place (legacy spread-then-mutate patterns, third-party libs
// like dnd-kit that take direct refs to array entries). With
// autoFreeze on, immer's frozen `next` objects break those code
// paths — observed as a setRef → state-update → re-render infinite
// loop after step delete (dnd-kit refs on the now-frozen steps
// array re-triggering on every render). Patches still work
// correctly without freezing.
setAutoFreeze(false);

// Per-mount Zustand store for the builder's coordinated state.
// Consumers read via `useBuilderStore(selector)` — one selector per
// field is the recommended pattern; the store's value is its
// selector-friendly subscription topology. Imperative methods
// (saveContent / fetchContentAndVersion / setAutoSaveValidator) stay in
// the Provider because they close over
// Apollo hook returns that can't live in a non-React store;
// consumers read them via `useBuilderMethods()`.

// Save FSM — discriminated union tracking the auto-save lifecycle.
// V1 used a single boolean `isLoading` overloaded with two semantics
// (loading initial content vs saving in flight) plus no in-flight
// tracking, which gave three race classes: edit-during-save (stale
// snapshot overwrites new edit on response), multiple concurrent
// saves (no guard), and unmounted-during-save warnings. PR γ
// separates "saving" out of isLoading and adds an explicit FSM with
// per-save identity check (older responses are ignored when a newer
// save has started). HTTP-level abort isn't attempted — server
// writes are idempotent, so letting older requests complete and
// discarding their responses is the correct semantic.
export type SaveState =
  | { status: 'idle' }
  | { status: 'dirty' }
  | { status: 'saving'; saveId: number }
  | { status: 'saved'; savedAt: number }
  | { status: 'error'; error: Error };

// Undo / redo history for `currentVersion`. Each entry is a pair of
// patches captured via immer's produceWithPatches: forward applied
// to redo, inverse applied to undo. Stacks are bounded only by user
// patience (no cap yet — ContentVersion is small KB-scale; bound when
// memory matters).
export interface HistoryEntry {
  forward: Patch[];
  inverse: Patch[];
}

export interface HistoryStack {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

const EMPTY_HISTORY: HistoryStack = { past: [], future: [] };

export interface BuilderState {
  currentStep: Step | null;
  currentContent: Content | undefined;
  currentVersion: ContentVersion | undefined;
  backupVersion: ContentVersion | undefined;
  currentTheme: Theme | undefined;
  isShowError: boolean;
  position: string;
  // True only while a non-FSM mutation (currently the theme change in
  // sidebar-theme) is in flight; folded into `useIsBusy` + the
  // beforeunload guard. The initial-content load is no longer tracked
  // here — that gate moved to `ready` in useBuilderInit — so this
  // starts `false`.
  isLoading: boolean;
  saveState: SaveState;
  history: HistoryStack;
  // Per-type sub-mode UI buffer (Launcher target/tooltip, Checklist item,
  // ResourceCenter block/tab). Held here — not in useTypeEditor's local
  // state — so the sub-editor's Header/Body/Footer, which each call the
  // editor hook, share ONE draft. `unknown` because each content type's
  // shape differs; one builder mount edits one content/type, so there's no
  // cross-type bleed. useTypeEditor read-time-defaults it to the type's
  // config.defaultUIState.
  typeEditorUIState: unknown;
}

// Public setters — exposed on the store for `useBuilderStore`
// selector access by any consumer.
//
// `backupVersion` is set only internally by the Provider's
// `fetchContentAndVersion`, so it has a private setter (below) and no
// public one.
//
// Flow-specific cursors (`currentStep`, `isShowError`) are read by
// cross-type hooks (use-current-theme, use-content-position,
// use-actions-save-gate) but only written from Flow code. Their setters
// live in the private group below; Flow writes go through
// `useFlowEditor()` which reads them off `useBuilderStore` directly.
// (currentIndex is NOT here — useFlowEditor derives it from the route.)
export interface BuilderStateSetters {
  setCurrentContent: React.Dispatch<React.SetStateAction<Content | undefined>>;
  setCurrentVersion: React.Dispatch<React.SetStateAction<ContentVersion | undefined>>;
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme | undefined>>;
  setPosition: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Private setters — used by Provider internals or read off the raw
// store via `useBuilderStore(s => s.setX)` by per-type editor hooks
// (useFlowEditor, etc.). Intentionally separated from the public
// setters so cross-type consumers can't reach into Flow-only buffers
// by accident.
export interface BuilderStatePrivateSetters {
  setBackupVersion: (value: ContentVersion | undefined) => void;
  // Flow-only buffers — writers live in useFlowEditor.
  setCurrentStep: React.Dispatch<React.SetStateAction<Step | null>>;
  setIsShowError: React.Dispatch<React.SetStateAction<boolean>>;
  // Save FSM transition. Provider's saveContent is the only writer;
  // consumers read via `useSaveState()`.
  transitionSaveState: (next: SaveState | ((prev: SaveState) => SaveState)) => void;
  // Server-driven currentVersion update — used by Provider's
  // fetchContentAndVersion after init/save. Bypasses history capture
  // so save round-trips don't pollute the undo stack; the public
  // `setCurrentVersion` is the only path that pushes onto past.
  setCurrentVersionFromServer: (value: ContentVersion | undefined) => void;
  // Per-type sub-mode UI buffer setter — written via useTypeEditor's
  // setUIState; every per-type editor instance shares this one slot.
  setTypeEditorUIState: React.Dispatch<React.SetStateAction<unknown>>;
}

// Undo/redo actions on `currentVersion`. Reading the stacks
// (canUndo / canRedo) is via selectors on `history`.
export interface BuilderHistoryActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

export type BuilderStoreState = BuilderState &
  BuilderStateSetters &
  BuilderStatePrivateSetters &
  BuilderHistoryActions;

export type BuilderStore = ReturnType<typeof createBuilderStore>;

// SetStateAction<T> dispatcher: accepts a value or an updater function.
// Mirrors React's `setState` so consumers' call sites (`setX(value)` /
// `setX(prev => ...)`) work unchanged.
const makeSetter = <K extends keyof BuilderState>(
  key: K,
  set: (partial: Partial<BuilderState>) => void,
  get: () => BuilderState,
): React.Dispatch<React.SetStateAction<BuilderState[K]>> => {
  return (value) => {
    const next =
      typeof value === 'function'
        ? (value as (prev: BuilderState[K]) => BuilderState[K])(get()[key])
        : value;
    set({ [key]: next } as Partial<BuilderState>);
  };
};

const initialState: BuilderState = {
  currentStep: null,
  currentContent: undefined,
  currentVersion: undefined,
  backupVersion: undefined,
  currentTheme: undefined,
  isShowError: false,
  position: 'left',
  isLoading: false,
  saveState: { status: 'idle' },
  history: EMPTY_HISTORY,
  typeEditorUIState: undefined,
};

export const createBuilderStore = () =>
  createStore<BuilderStoreState>((set, get) => ({
    ...initialState,
    setCurrentStep: makeSetter('currentStep', set, get),
    setCurrentContent: makeSetter('currentContent', set, get),
    // Public setCurrentVersion captures patches via immer and pushes
    // them onto the undo stack. setCurrentVersionFromServer (private,
    // below) bypasses this — Provider's fetchContentAndVersion uses
    // it so save round-trips don't pollute the undo history.
    setCurrentVersion: (value) => {
      const prev = get().currentVersion;
      if (!prev) {
        const next = typeof value === 'function' ? value(prev) : value;
        set({ currentVersion: next });
        return;
      }
      // produceWithPatches handles both call forms; when the recipe
      // returns a new value (rather than mutating draft), immer emits
      // a coarse root-replace patch — correct semantically, just less
      // memory-efficient than fine-grained per-field patches.
      const recipe =
        typeof value === 'function'
          ? (value as (draft: ContentVersion) => ContentVersion | undefined)
          : () => value as ContentVersion;
      const [next, forward, inverse] = produceWithPatches(prev, recipe);
      const past = get().history.past;
      set({
        currentVersion: next as ContentVersion,
        history: {
          past: [...past, { forward, inverse }],
          future: [],
        },
      });
    },
    setCurrentTheme: makeSetter('currentTheme', set, get),
    setIsShowError: makeSetter('isShowError', set, get),
    setPosition: makeSetter('position', set, get),
    setIsLoading: makeSetter('isLoading', set, get),
    setBackupVersion: (value) => set({ backupVersion: value }),
    setCurrentVersionFromServer: (value) => set({ currentVersion: value }),
    setTypeEditorUIState: makeSetter('typeEditorUIState', set, get),
    transitionSaveState: (next) => {
      const computed = typeof next === 'function' ? next(get().saveState) : next;
      set({ saveState: computed });
    },
    undo: () => {
      const { past, future } = get().history;
      const prev = get().currentVersion;
      if (past.length === 0 || !prev) {
        return;
      }
      const entry = past[past.length - 1];
      const next = applyPatches(prev, entry.inverse);
      set({
        currentVersion: next,
        history: {
          past: past.slice(0, -1),
          future: [...future, entry],
        },
      });
    },
    redo: () => {
      const { past, future } = get().history;
      const prev = get().currentVersion;
      if (future.length === 0 || !prev) {
        return;
      }
      const entry = future[future.length - 1];
      const next = applyPatches(prev, entry.forward);
      set({
        currentVersion: next,
        history: {
          past: [...past, entry],
          future: future.slice(0, -1),
        },
      });
    },
    clearHistory: () => set({ history: EMPTY_HISTORY }),
  }));
