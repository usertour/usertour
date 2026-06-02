import { arrayMove } from '@dnd-kit/sortable';
import { useCallback } from 'react';

// Generic add / remove / update / reorder over an array field, agnostic
// to where the array lives: the caller supplies `setItems`, which commits
// the whole next array via whatever write path it owns —
// `editor.updateData({ items })` for data-blob types, `setCurrentVersion`
// for Flow steps, or a nested `updateTabBlocks(...)` for RC blocks. This
// hook only owns the array transform; per-type side effects (re-pointing
// a selection, validation, mode exit) stay in the caller's wrappers.

export interface UseListFieldOptions<T> {
  items: T[];
  /** Commit the whole next array. Caller owns the write path + any guards. */
  setItems: (next: T[]) => void;
  /** Defaults to `item.id`. */
  getId?: (item: T) => string;
}

export interface UseListFieldReturn<T> {
  add: (item: T) => void;
  removeById: (id: string) => void;
  updateById: (id: string, updates: Partial<T>) => void;
  reorder: (from: number, to: number) => void;
}

const defaultGetId = <T>(item: T): string => (item as { id: string }).id;

export const useListField = <T>(options: UseListFieldOptions<T>): UseListFieldReturn<T> => {
  const { items, setItems, getId = defaultGetId } = options;

  const add = useCallback((item: T) => setItems([...items, item]), [items, setItems]);

  const removeById = useCallback(
    (id: string) => setItems(items.filter((item) => getId(item) !== id)),
    [items, setItems, getId],
  );

  const updateById = useCallback(
    (id: string, updates: Partial<T>) =>
      setItems(items.map((item) => (getId(item) === id ? { ...item, ...updates } : item))),
    [items, setItems, getId],
  );

  // arrayMove(items, from, to) is exactly the splice(from,1)+splice(to,0,x)
  // the per-type editors hand-rolled.
  const reorder = useCallback(
    (from: number, to: number) => setItems(arrayMove(items, from, to)),
    [items, setItems],
  );

  return { add, removeById, updateById, reorder };
};
