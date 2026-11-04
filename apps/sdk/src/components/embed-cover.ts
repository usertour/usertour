import { autoUpdate, platform, type Rect } from '@floating-ui/dom';
import type { CSSProperties } from 'react';

import { document } from '@/utils';

import { type PlacedMount, applyStyleObject, detachMountEl, insertMountEl } from './inline-mount';

/**
 * COVER: the mount element is an absolutely positioned child of the target,
 * filling it, with the target as its containing block — a static target gets
 * `position: relative` for as long as the cover is placed. The page then
 * scrolls, clips and transforms the two together with no per-frame work; a
 * fixed overlay re-placed from scroll events trails the target by a frame.
 * A target that renders no child (an image, a canvas, a form control, a
 * frame), or one that scrolls its own content — a child would scroll away
 * with it — gets a body-level mount at document coordinates instead, tracked
 * by floating-ui's autoUpdate. The target's own content is untouched.
 */
const FILL_STYLE: CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
  ['--usertour-widget-embed-height' as string]: '100%',
};

/** Whether the element scrolls its own content, so a child would scroll with it. */
const scrollsItsContent = (element: HTMLElement): boolean => {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) {
    return false;
  }
  const scrolls = (overflow: string) =>
    overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
  return (
    (scrolls(style.overflowY) && element.scrollHeight > element.clientHeight) ||
    (scrolls(style.overflowX) && element.scrollWidth > element.clientWidth)
  );
};

/**
 * Makes the host its cover's containing block and returns the undo. A host
 * that is positioned already is left alone.
 */
const holdAsContainingBlock = (host: HTMLElement): (() => void) => {
  const view = host.ownerDocument.defaultView;
  if (!view || view.getComputedStyle(host).position !== 'static') {
    return () => {};
  }
  const previous = host.style.position;
  host.style.position = 'relative';
  return () => {
    if (host.style.position === 'relative') {
      host.style.position = previous;
    }
  };
};

/** Inside the host, filling it. Null when the host renders no child. */
const placeInsideTarget = (
  mountEl: HTMLDivElement,
  host: HTMLElement,
  style: CSSProperties,
): PlacedMount | null => {
  applyStyleObject(mountEl, { ...FILL_STYLE, ...style });
  insertMountEl(mountEl, { parent: host, insertMode: 'append' });
  if (mountEl.offsetParent === null) {
    detachMountEl(mountEl);
    return null;
  }
  const releaseHost = holdAsContainingBlock(host);
  return {
    holds: (next) => next === host && mountEl.parentElement === host,
    restyle: (next) => applyStyleObject(mountEl, { ...FILL_STYLE, ...next }),
    release: () => {
      releaseHost();
      detachMountEl(mountEl);
    },
  };
};

/** The target's border box relative to the mount's containing block. */
const trackedStyle = (reference: Rect): CSSProperties => ({
  // Explicit units: these land on the element's style object directly, where
  // a bare number is not a length (React's px shorthand does not apply).
  position: 'absolute',
  top: `${reference.y}px`,
  left: `${reference.x}px`,
  width: `${reference.width}px`,
  height: `${reference.height}px`,
  ['--usertour-widget-embed-height' as string]: `${reference.height}px`,
});

/** In the body, tracking the target's box. */
const placeInBody = (
  mountEl: HTMLDivElement,
  target: Element,
  style: CSSProperties,
): PlacedMount | null => {
  const body = document?.body;
  if (!body) {
    return null;
  }
  let shell = style;
  let applied = '';
  let stopped = false;
  // Positioned before it is placed, so it never takes part in the page's layout.
  applyStyleObject(mountEl, { position: 'absolute', ...shell });
  body.appendChild(mountEl);
  const update = () => {
    void Promise.resolve(
      platform.getElementRects({ reference: target, floating: mountEl, strategy: 'absolute' }),
    ).then(({ reference }) => {
      if (stopped) {
        return;
      }
      const next = { ...trackedStyle(reference), ...shell };
      const key = JSON.stringify(next);
      if (key !== applied) {
        applied = key;
        applyStyleObject(mountEl, next);
      }
    });
  };
  update();
  const stop = autoUpdate(target, mountEl, update);
  return {
    holds: (next) => next === target,
    restyle: (next) => {
      shell = next;
      update();
    },
    release: () => {
      stopped = true;
      stop();
      detachMountEl(mountEl);
    },
  };
};

/** Places a cover over `target`; `style` is the shell's own style (its z-index). */
export const placeCover = (
  mountEl: HTMLDivElement,
  target: Element,
  style: CSSProperties,
): PlacedMount | null => {
  if (target instanceof HTMLElement && !scrollsItsContent(target)) {
    const inside = placeInsideTarget(mountEl, target, style);
    if (inside) {
      return inside;
    }
  }
  return placeInBody(mountEl, target, style);
};
