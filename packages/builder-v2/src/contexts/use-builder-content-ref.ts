import { useContext } from 'react';
import { BuilderProviderContext } from '../provider/builder-provider';

// The Provider-owned <div> ref that step content (Bubble / Modal /
// Popper) attaches to. Identity-stable across the Provider lifetime
// (it's a useRef). Reading this hook costs zero subscriptions —
// consumers re-render only when their parent does.
export const useBuilderContentRef = (): React.MutableRefObject<HTMLDivElement | undefined> => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderContentRef must be used within a BuilderProvider.');
  }
  return ctx.contentRef;
};
