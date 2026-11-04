import { autoUpdate, platform, type Rect } from '@floating-ui/dom';
import { AssetAttributes } from '@usertour/frame';
import {
  ContentEditorSerialize,
  EmbedRoot,
  InlineFrame,
  LinkDecoratorContext,
  WidgetLocaleProvider,
  getEmbedWrapperStyle,
} from '@usertour/widget';
import {
  ContentEditorClickableElement,
  ContentEditorRoot,
  EmbedData,
  EmbedPlacement,
  Step,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { document } from '@/utils';

import {
  applyStyleObject,
  createMountEl,
  detachMountEl,
  insertMountEl,
  resolveElementMountPlacement,
} from './inline-mount';

type EmbedWidgetStore = {
  openState: boolean;
  globalStyle: string;
  zIndex: number;
  themeSettings: ThemeTypesSetting;
  assets?: AssetAttributes[];
  removeBranding: boolean;
  userAttributes?: UserTourTypes.Attributes;
  userLocale?: string;
  embedData?: EmbedData;
  currentStep?: Step;
  targetElement?: Element | null;
  linkUrlDecorator?: ((url: string) => string) | null;
};

type EmbedWidgetInstance = {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => EmbedWidgetStore | undefined;
  handleDismiss?: () => void | Promise<void>;
  handleOnClick?: (element: ContentEditorClickableElement, value?: unknown) => Promise<void>;
};

type EmbedWidgetProps = {
  embed: EmbedWidgetInstance;
};

const MOUNT_CLASS = 'usertour-widget-embed';

const useEmbedStore = (embed: EmbedWidgetInstance) => {
  const store = useSyncExternalStore(embed.subscribe, embed.getSnapshot);
  if (!store?.embedData || !store.currentStep || !store.openState || !store.targetElement) {
    return null;
  }
  return store;
};

/**
 * COVER: the mount element is an absolutely positioned child of the target,
 * filling it, with the target as its containing block — a static target gets
 * `position: relative` for as long as the cover is mounted. The page then
 * scrolls, clips and transforms the two together with no per-frame work; a
 * fixed overlay re-placed from scroll events trails the target by a frame.
 * A target that renders no child (an image, a canvas, a form control, a
 * frame), or one that scrolls its own content — a child would scroll away
 * with it — gets a body-level mount at document coordinates instead, tracked
 * by floating-ui's autoUpdate. The target's own content is untouched.
 */
const COVER_FILL_STYLE: React.CSSProperties = {
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
const holdCover = (host: HTMLElement): (() => void) => {
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

/** The body-level mount: the target's border box relative to the mount's containing block. */
const coverStyle = (reference: Rect, zIndex: number): React.CSSProperties => {
  // Explicit units: these land on the element's style object directly, where
  // a bare number is not a length (React's px shorthand does not apply).
  return {
    position: 'absolute',
    top: `${reference.y}px`,
    left: `${reference.x}px`,
    width: `${reference.width}px`,
    height: `${reference.height}px`,
    zIndex,
    ['--usertour-widget-embed-height' as string]: `${reference.height}px`,
  };
};

export const EmbedWidget = ({ embed }: EmbedWidgetProps) => {
  const store = useEmbedStore(embed);
  const mountElRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  // Live height reported from inside the frame (EmbedRoot measures it); null =
  // pending, keeps an in-flow shell at zero height until the real height lands.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  // Bumped when the mount element had to move (the target was replaced by a
  // new node): a moved iframe reloads its document while the frame keeps
  // rendering into the old one, so the frame is rebuilt in the new place.
  const [frameGeneration, setFrameGeneration] = useState(0);

  const { embedData, currentStep, themeSettings, assets, userAttributes, targetElement, zIndex } =
    store ?? {};

  const placement = embedData?.placement ?? EmbedPlacement.IMMEDIATELY_AFTER_ELEMENT;
  const isCover = placement === EmbedPlacement.COVER_ELEMENT;

  const contents = useMemo(
    () => (currentStep?.data as ContentEditorRoot[] | undefined) ?? [],
    [currentStep?.data],
  );

  useEffect(() => {
    if (!mountElRef.current) {
      const el = createMountEl(MOUNT_CLASS);
      mountElRef.current = el;
      setPortalEl(el);
    }
    return () => {
      detachMountEl(mountElRef.current);
      mountElRef.current = null;
    };
  }, []);

  // In-flow placements: style the shell from the measurement and insert it at
  // the target. Pulled out of the page while closed or without a target so no
  // empty shell is left in the layout.
  useLayoutEffect(() => {
    const mountEl = mountElRef.current;
    if (!mountEl) {
      return;
    }
    if (!store || !targetElement || isCover) {
      if (!isCover) {
        detachMountEl(mountEl);
      }
      return;
    }
    mountEl.className = MOUNT_CLASS;
    applyStyleObject(mountEl, getEmbedWrapperStyle(measuredHeight));
    const resolved = resolveElementMountPlacement(placement, targetElement);
    if (!resolved) {
      return;
    }
    if (insertMountEl(mountEl, resolved)) {
      setFrameGeneration((generation) => generation + 1);
    }
  }, [store, targetElement, placement, isCover, portalEl, measuredHeight]);

  // Cover placement: inside the target, or body-level when the target cannot
  // hold it (see COVER_FILL_STYLE).
  useLayoutEffect(() => {
    const mountEl = mountElRef.current;
    if (!mountEl || !isCover) {
      return;
    }
    if (!store || !targetElement || !document?.body) {
      detachMountEl(mountEl);
      return;
    }
    mountEl.className = MOUNT_CLASS;

    const host =
      targetElement instanceof HTMLElement && !scrollsItsContent(targetElement)
        ? targetElement
        : null;
    if (host) {
      applyStyleObject(mountEl, { ...COVER_FILL_STYLE, zIndex: zIndex ?? 0 });
      const moved = insertMountEl(mountEl, { parent: host, insertMode: 'append' });
      // A host that renders no child gives the mount no box.
      if (mountEl.offsetParent !== null) {
        if (moved) {
          setFrameGeneration((generation) => generation + 1);
        }
        return holdCover(host);
      }
      detachMountEl(mountEl);
    }

    if (mountEl.style.position !== 'absolute') {
      applyStyleObject(mountEl, { position: 'absolute', zIndex: zIndex ?? 0 });
    }
    if (mountEl.parentNode !== document.body) {
      const wasPlaced = mountEl.parentNode !== null;
      document.body.appendChild(mountEl);
      if (wasPlaced) {
        setFrameGeneration((generation) => generation + 1);
      }
    }
    let stopped = false;
    let applied = '';
    const update = () => {
      void Promise.resolve(
        platform.getElementRects({
          reference: targetElement,
          floating: mountEl,
          strategy: 'absolute',
        }),
      ).then(({ reference }) => {
        if (stopped) {
          return;
        }
        const style = coverStyle(reference, zIndex ?? 0);
        const key = JSON.stringify(style);
        if (key !== applied) {
          applied = key;
          applyStyleObject(mountEl, style);
        }
      });
    };
    update();
    const stop = autoUpdate(targetElement, mountEl, update);
    return () => {
      stopped = true;
      stop();
    };
  }, [store, targetElement, isCover, zIndex, portalEl]);

  if (!store || !embedData || !currentStep || !themeSettings || !targetElement) {
    return null;
  }

  const mountEl = portalEl;
  if (!mountEl) {
    return null;
  }

  return createPortal(
    <WidgetLocaleProvider key={frameGeneration} locale={store.userLocale}>
      <LinkDecoratorContext.Provider value={store.linkUrlDecorator || null}>
        <EmbedRoot
          themeSettings={themeSettings}
          data={embedData}
          zIndex={zIndex}
          assets={assets}
          globalStyle={store.globalStyle}
          onDismiss={embed.handleDismiss}
          onMeasuredHeightChange={setMeasuredHeight}
        >
          <InlineFrame>
            {/* Keyed by step: a step change is a new document, not an edit of
                the last one. Patched in place, a button landing in the same
                slot would keep the previous button's node, and with it its
                pending state and a colour transition out of its variant. */}
            <ContentEditorSerialize
              key={currentStep.cvid}
              contents={contents}
              userAttributes={userAttributes}
              onClick={embed.handleOnClick}
            />
          </InlineFrame>
        </EmbedRoot>
      </LinkDecoratorContext.Provider>
    </WidgetLocaleProvider>,
    mountEl,
  );
};

EmbedWidget.displayName = 'EmbedWidget';
