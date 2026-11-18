import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { PlacedMount } from './inline-mount';

/** Places a shell's mount element for a target; null when it cannot be placed. */
export type MountPlacer = (
  mountEl: HTMLDivElement,
  target: Element | null,
  style: CSSProperties,
) => PlacedMount | null;

/**
 * Keeps a shell's mount element placed in the page while `open`: placed once,
 * re-placed only when its place actually changed (a target the mount is not
 * already beside or inside, another placer), restyled in place otherwise.
 * Returns a generation that advances when the mount was re-placed while a
 * frame rendered into it: a re-inserted iframe reloads its document while the
 * frame keeps rendering into the old one, so the caller rebuilds the frame.
 * The place is re-checked whenever the shell's style changes too (new
 * content data, a new measurement): the host may have moved the very same
 * target since, which no target change reports. The check is a sibling walk,
 * and a mount still in place is left alone.
 *
 * Nothing here releases the mount from a layout-effect cleanup: a Suspense
 * boundary that re-suspends (another widget kind loading its chunk) runs
 * those on its mounted siblings, and a released mount drops its iframe's
 * document. The one release on unmount is a passive effect, which the
 * boundary leaves alone.
 */
export const usePlacedMount = (
  mountEl: HTMLDivElement | null,
  open: boolean,
  target: Element | null,
  place: MountPlacer,
  style: CSSProperties,
): number => {
  const placedRef = useRef<PlacedMount | null>(null);
  const placedByRef = useRef<MountPlacer | null>(null);
  const wasPlacedRef = useRef(false);
  const [frameGeneration, setFrameGeneration] = useState(0);

  useLayoutEffect(() => {
    placedRef.current?.restyle(style);
  }, [style]);

  useLayoutEffect(() => {
    const placed = placedRef.current;
    if (!mountEl || !open) {
      placed?.release();
      placedRef.current = null;
      wasPlacedRef.current = false;
      return;
    }
    if (placed && placedByRef.current === place && placed.holds(target)) {
      return;
    }
    placed?.release();
    placedRef.current = null;
    const next = place(mountEl, target, style);
    if (!next) {
      return;
    }
    if (wasPlacedRef.current) {
      setFrameGeneration((generation) => generation + 1);
    }
    wasPlacedRef.current = true;
    placedRef.current = next;
    placedByRef.current = place;
  }, [mountEl, open, target, place, style]);

  useEffect(
    () => () => {
      placedRef.current?.release();
      placedRef.current = null;
    },
    [],
  );

  return frameGeneration;
};
