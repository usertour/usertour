import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  // Stable key for localStorage persistence. Pass `null` to skip persistence.
  storageKey: string | null;
  defaultWidth: number;
  min: number;
  max: number;
  // Drag direction relative to the sidebar's interior:
  //   'right'  → handle is on the right edge, dragging right grows width
  //   'left'   → handle is on the left edge, dragging left grows width
  edge: 'left' | 'right';
}

interface Result {
  width: number;
  isResizing: boolean;
  // True when current width is clamped at `min` — used by the resize handle
  // to render a directional arrow indicating the only direction the panel
  // can grow.
  isAtMin: boolean;
  // Spread onto the resize handle element (just `onMouseDown` in practice).
  handleProps: {
    onMouseDown: (event: React.MouseEvent) => void;
  };
}

const readStoredWidth = (key: string | null): number | null => {
  if (!key || typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function useResizable({ storageKey, defaultWidth, min, max, edge }: Options): Result {
  const [width, setWidth] = useState<number>(() => {
    const stored = readStoredWidth(storageKey);
    return stored != null ? clamp(stored, min, max) : defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Track drag origin so width updates depend only on the delta from start.
  const dragOriginRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      dragOriginRef.current = { startX: event.clientX, startWidth: width };
      setIsResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (event: MouseEvent) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const delta = event.clientX - origin.startX;
      const next = edge === 'right' ? origin.startWidth + delta : origin.startWidth - delta;
      setWidth(clamp(next, min, max));
    };

    const handleUp = () => {
      setIsResizing(false);
      dragOriginRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    // While dragging, lock cursor + suppress text selection globally so the
    // handle feels firm and the user doesn't accidentally select preview text.
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing, min, max, edge]);

  // Persist after each commit (not during drag, to avoid spamming storage).
  useEffect(() => {
    if (!storageKey || isResizing || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, String(width));
  }, [width, isResizing, storageKey]);

  return { width, isResizing, isAtMin: width <= min, handleProps: { onMouseDown } };
}
