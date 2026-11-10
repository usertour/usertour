import { BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT } from '@usertour/constants';
import { AssetAttributes } from '@usertour/frame';
import {
  BannerRoot,
  ContentEditorSerialize,
  BannerFrame,
  getBannerWrapperStyle,
  LinkDecoratorContext,
  WidgetLocaleProvider,
} from '@usertour/widget';
import {
  BannerData,
  BannerEmbedPlacement,
  ContentEditorClickableElement,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useEffect,
  useState,
  CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { document, isHTMLElement } from '@/utils';

type BannerWidgetStore = {
  openState: boolean;
  globalStyle: string;
  zIndex: number;
  themeSettings: ThemeTypesSetting;
  assets?: AssetAttributes[];
  removeBranding: boolean;
  userAttributes?: UserTourTypes.Attributes;
  userLocale?: string;
  bannerData?: BannerData;
  targetElement?: Element | null;
  linkUrlDecorator?: ((url: string) => string) | null;
};

type BannerWidgetInstance = {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => BannerWidgetStore | undefined;
  handleDismiss?: () => void | Promise<void>;
  handleOnClick?: (element: ContentEditorClickableElement, value?: unknown) => Promise<void>;
};

type BannerWidgetProps = {
  banner: BannerWidgetInstance;
};

type BannerMountPlacement = {
  parent: HTMLElement;
  insertMode: 'append' | 'prepend' | 'before' | 'after';
  anchor?: Element;
};

/**
 * Applies React CSSProperties to an HTMLElement's inline style.
 * Uses the DOM's native style assignment so the browser normalizes values
 * (e.g. numbers for dimensions become "px", unitless props like zIndex stay numeric).
 * Custom properties (--*) use setProperty for correct handling.
 */
const applyStyleObject = (el: HTMLElement, style: CSSProperties) => {
  el.style.cssText = '';
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (key.startsWith('--')) {
      el.style.setProperty(key, String(value));
      continue;
    }
    (el.style as unknown as Record<string, string | number>)[key] = value;
  }
};

const resolveBannerPlacement = (
  placement: BannerEmbedPlacement,
  targetElement?: Element | null,
): BannerMountPlacement | null => {
  if (!document?.body) {
    return null;
  }

  switch (placement) {
    case BannerEmbedPlacement.TOP_OF_PAGE:
      return { parent: document.body, insertMode: 'prepend' };
    case BannerEmbedPlacement.BOTTOM_OF_PAGE:
      return { parent: document.body, insertMode: 'append' };
    case BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT:
      if (isHTMLElement(targetElement)) {
        return { parent: targetElement, insertMode: 'prepend' };
      }
      return null;
    case BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT:
      if (isHTMLElement(targetElement)) {
        return { parent: targetElement, insertMode: 'append' };
      }
      return null;
    case BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT:
      if (targetElement?.parentElement) {
        return { parent: targetElement.parentElement, insertMode: 'before', anchor: targetElement };
      }
      return null;
    case BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT:
      if (targetElement?.parentElement) {
        return { parent: targetElement.parentElement, insertMode: 'after', anchor: targetElement };
      }
      return null;
    default:
      return { parent: document.body, insertMode: 'prepend' };
  }
};

/**
 * Puts the mount element at its placement. Returns whether it was inserted:
 * false when it already sits there, or when the placement cannot take it.
 */
const insertMountEl = (mountEl: HTMLDivElement, placement: BannerMountPlacement): boolean => {
  const { parent, insertMode, anchor } = placement;

  if (!parent.isConnected) {
    return false;
  }

  if (mountEl.parentNode === parent) {
    if (insertMode === 'append' && mountEl === parent.lastChild) {
      return false;
    }
    if (insertMode === 'prepend' && mountEl === parent.firstChild) {
      return false;
    }
    if (insertMode === 'before' && anchor && mountEl.nextSibling === anchor) {
      return false;
    }
    if (insertMode === 'after' && anchor && anchor.nextSibling === mountEl) {
      return false;
    }
  }

  switch (insertMode) {
    case 'append':
      parent.appendChild(mountEl);
      break;
    case 'prepend':
      parent.insertBefore(mountEl, parent.firstChild);
      break;
    case 'before':
      if (!anchor?.parentNode) {
        return false;
      }
      anchor.parentNode.insertBefore(mountEl, anchor);
      break;
    case 'after':
      if (!anchor?.parentNode) {
        return false;
      }
      anchor.parentNode.insertBefore(mountEl, anchor.nextSibling);
      break;
    default:
      parent.appendChild(mountEl);
  }
  return true;
};

const useBannerStore = (banner: BannerWidgetInstance) => {
  const store = useSyncExternalStore(banner.subscribe, banner.getSnapshot);
  if (!store?.bannerData || !store.openState) {
    return null;
  }

  return store;
};

export const BannerWidget = ({ banner }: BannerWidgetProps) => {
  const store = useBannerStore(banner);
  const mountElRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  // Live banner height reported from inside the frame (BannerRoot measures it);
  // null = pending, keeps the wrapper hidden until the reveal can use the real
  // height. BannerRoot fails open after 500ms so this always resolves.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  // Whether the shell sits in the page with the frame rendered into it, and
  // how many times it was moved while it did. A moved iframe loads a new,
  // empty document while the frame keeps rendering into the old one, so the
  // frame is rebuilt (keyed by this count) whenever its shell is moved: a
  // target replaced by an SPA navigation, a sibling that took its place.
  const placedRef = useRef(false);
  const [frameGeneration, setFrameGeneration] = useState(0);

  const { bannerData, themeSettings, assets, userAttributes, targetElement, zIndex, globalStyle } =
    store ?? {};

  const placement = bannerData?.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
  const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(placement);

  const contents = useMemo(() => bannerData?.contents ?? [], [bannerData?.contents]);

  useEffect(() => {
    if (!mountElRef.current && document?.createElement) {
      const el = document.createElement('div');
      el.className = 'usertour-widget-banner';
      mountElRef.current = el;
      setPortalEl(el);
    }

    return () => {
      const mountEl = mountElRef.current;
      if (mountEl?.parentNode) {
        mountEl.parentNode.removeChild(mountEl);
      }
      mountElRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!store || !bannerData || (requiresElement && !targetElement)) {
      // The component below returns null in these states so the CONTENT
      // unmounts, but the mount shell insertMountEl placed into the page
      // (with the banner's height styles) is only removed on component
      // unmount — leaving a transparent banner-sized gap while the banner
      // is closed (visibility loop hid it) or its target is missing. Pull
      // the shell out; the effect re-inserts it on reopen.
      const mountEl = mountElRef.current;
      if (mountEl?.parentNode) {
        mountEl.parentNode.removeChild(mountEl);
      }
      placedRef.current = false;
      return;
    }

    const mountEl = mountElRef.current;
    if (!mountEl) {
      return;
    }

    const wrapperStyle = getBannerWrapperStyle(bannerData, themeSettings, zIndex, measuredHeight);
    mountEl.className = 'usertour-widget-banner';
    applyStyleObject(mountEl, wrapperStyle);

    const resolved = resolveBannerPlacement(placement, targetElement);
    if (!resolved) {
      return;
    }

    if (!insertMountEl(mountEl, resolved)) {
      return;
    }
    if (placedRef.current) {
      setFrameGeneration((generation) => generation + 1);
    }
    placedRef.current = true;
  }, [store, bannerData, placement, targetElement, requiresElement, portalEl, measuredHeight]);

  if (!store || !bannerData || !themeSettings) {
    return null;
  }

  if (requiresElement && !targetElement) {
    return null;
  }

  const mountEl = portalEl;
  if (!mountEl) {
    return null;
  }

  return createPortal(
    <WidgetLocaleProvider key={frameGeneration} locale={store.userLocale}>
      <LinkDecoratorContext.Provider value={store.linkUrlDecorator || null}>
        <BannerRoot
          themeSettings={themeSettings}
          data={bannerData}
          zIndex={zIndex}
          assets={assets}
          globalStyle={globalStyle}
          onDismiss={banner.handleDismiss}
          onMeasuredHeightChange={setMeasuredHeight}
        >
          <BannerFrame>
            <ContentEditorSerialize
              contents={contents}
              userAttributes={userAttributes}
              onClick={banner.handleOnClick}
            />
          </BannerFrame>
        </BannerRoot>
      </LinkDecoratorContext.Provider>
    </WidgetLocaleProvider>,
    mountEl,
  );
};

BannerWidget.displayName = 'BannerWidget';
