import { useEvent } from 'react-use';
import type { BuilderStore } from '../store/builder-store';

export interface UseUndoShortcutsArgs {
  store: BuilderStore;
}

// Builder-level Cmd+Z / Cmd+Shift+Z / Cmd+Y keyboard shortcuts that
// dispatch to the store's undo / redo actions on currentVersion.
//
// Skipped when an editable element is focused — text inputs /
// contenteditable areas have their own native undo for the text they
// manage, and hijacking Cmd+Z there would interfere with intra-field
// editing. The ContentEditor inside rich-text step content runs its
// own undo inside the contenteditable; this binding only catches
// Cmd+Z when focus is on chrome (sidebar buttons, canvas, body).
export const useUndoShortcuts = (args: UseUndoShortcutsArgs): void => {
  const { store } = args;
  useEvent('keydown', (event: KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) {
      return;
    }
    const active = document.activeElement;
    const inEditable =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);
    if (inEditable) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      store.getState().undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      store.getState().redo();
    }
  });
};
