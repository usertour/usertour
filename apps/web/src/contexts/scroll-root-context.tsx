import { createContext, useContext, type ReactNode } from 'react';

// Lightweight context that lets a page-level component publish the
// scrollable element (`overflow-y: auto` div, ScrollArea viewport, etc.)
// that clips a list below it. List components reading from this context
// hand the element to `useInfiniteScroll`'s `rootRef`, so the
// IntersectionObserver fires against the actual clip rectangle instead
// of the window viewport.
//
// Required for any infinite-scroll list rendered inside an inner scroll
// container — without it, the sentinel is "in window viewport" even after
// the user has scrolled past it inside the inner container, and the IO
// callback never fires when it should (or fires when it shouldn't).
const ScrollRootContext = createContext<HTMLElement | null>(null);

interface ScrollRootProviderProps {
  value: HTMLElement | null;
  children: ReactNode;
}

export const ScrollRootProvider = ({ value, children }: ScrollRootProviderProps) => (
  <ScrollRootContext.Provider value={value}>{children}</ScrollRootContext.Provider>
);

/** Returns the registered scroll root, or `null` if no provider above. */
export const useScrollRoot = (): HTMLElement | null => useContext(ScrollRootContext);
