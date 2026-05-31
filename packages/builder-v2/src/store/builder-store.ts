import type { Content, ContentVersion, Step, Theme } from '@usertour/types';
import { createStore } from 'zustand/vanilla';
import type { SelectorOutput } from '../utils/screenshot';
import type { CurrentMode } from '../contexts/builder-mode';
import { BuilderMode } from '../contexts/builder-mode';

// Per-mount Zustand store for the builder's coordinated state. Replaces
// the BuilderContext god-context's state fields. Imperative methods
// (saveContent / initContent / fetchContentAndVersion / createStep /
// createNewStep / updateCurrentStep) stay in the Provider because they
// close over Apollo hook returns that can't live inside a non-React
// store. The Provider exposes the legacy `useBuilderContext()` shape
// (state ⊕ methods ⊕ config) so the 114 existing consumers don't
// change in this commit; selector-based subscription is a later step.

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

export interface BuilderState {
  currentMode: CurrentMode;
  environmentId: string;
  envToken: string;
  projectId: string;
  currentLocation: string;
  currentStep: Step | null;
  currentIndex: number;
  currentContent: Content | undefined;
  currentVersion: ContentVersion | undefined;
  backupVersion: ContentVersion | undefined;
  currentTheme: Theme | undefined;
  selectorOutput: SelectorOutput | null;
  isShowError: boolean;
  position: string;
  isLoading: boolean;
  saveState: SaveState;
}

// Only setters that the public `BuilderContextProps` API exposes today.
// `envToken`, `currentLocation`, `backupVersion` are set internally
// (by `initContent` / `fetchContentAndVersion`) — they have no public
// setter in V1's BuilderContext, so they have no public setter here.
export interface BuilderStateSetters {
  setCurrentMode: React.Dispatch<React.SetStateAction<CurrentMode>>;
  setEnvironmentId: React.Dispatch<React.SetStateAction<string>>;
  setProjectId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step | null>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentContent: React.Dispatch<React.SetStateAction<Content | undefined>>;
  setCurrentVersion: React.Dispatch<React.SetStateAction<ContentVersion | undefined>>;
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme | undefined>>;
  setSelectorOutput: React.Dispatch<React.SetStateAction<SelectorOutput | null>>;
  setIsShowError: React.Dispatch<React.SetStateAction<boolean>>;
  setPosition: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Private setters used by Provider's imperative methods only — not
// exposed via `useBuilderContext`.
export interface BuilderStatePrivateSetters {
  setEnvToken: (value: string) => void;
  setCurrentLocation: (value: string) => void;
  setBackupVersion: (value: ContentVersion | undefined) => void;
  // Save FSM transition. Provider's saveContent is the only writer;
  // consumers read via `useSaveState()`.
  transitionSaveState: (next: SaveState | ((prev: SaveState) => SaveState)) => void;
}

export type BuilderStoreState = BuilderState & BuilderStateSetters & BuilderStatePrivateSetters;

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
  currentMode: { mode: BuilderMode.NONE },
  environmentId: '',
  envToken: '',
  projectId: '',
  currentLocation: '',
  currentStep: null,
  currentIndex: 0,
  currentContent: undefined,
  currentVersion: undefined,
  backupVersion: undefined,
  currentTheme: undefined,
  selectorOutput: null,
  isShowError: false,
  position: 'left',
  isLoading: true,
  saveState: { status: 'idle' },
};

export const createBuilderStore = () =>
  createStore<BuilderStoreState>((set, get) => ({
    ...initialState,
    setCurrentMode: makeSetter('currentMode', set, get),
    setEnvironmentId: makeSetter('environmentId', set, get),
    setProjectId: makeSetter('projectId', set, get),
    setCurrentStep: makeSetter('currentStep', set, get),
    setCurrentIndex: makeSetter('currentIndex', set, get),
    setCurrentContent: makeSetter('currentContent', set, get),
    setCurrentVersion: makeSetter('currentVersion', set, get),
    setCurrentTheme: makeSetter('currentTheme', set, get),
    setSelectorOutput: makeSetter('selectorOutput', set, get),
    setIsShowError: makeSetter('isShowError', set, get),
    setPosition: makeSetter('position', set, get),
    setIsLoading: makeSetter('isLoading', set, get),
    setEnvToken: (value) => set({ envToken: value }),
    setCurrentLocation: (value) => set({ currentLocation: value }),
    setBackupVersion: (value) => set({ backupVersion: value }),
    transitionSaveState: (next) => {
      const computed = typeof next === 'function' ? next(get().saveState) : next;
      set({ saveState: computed });
    },
  }));
