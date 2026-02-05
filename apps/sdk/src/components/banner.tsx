import { AssetAttributes } from '@usertour-packages/frame';
import {
  BannerRoot,
  ContentEditorSerialize,
  BannerFrame,
  getBannerWrapperStyle,
} from '@usertour-packages/widget';
import {
  BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT,
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

import { document } from '@/utils';

type BannerWidgetStore = {
  openState: boolean;
  globalStyle: string;
  zIndex: number;
  themeSettings: ThemeTypesSetting;
  assets?: AssetAttributes[];
  removeBranding: boolean;
  userAttributes?: UserTourTypes.Attributes;
  bannerData?: BannerData;
  targetElement?: Element | null;
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
      if (targetElement instanceof HTMLElement) {
        return { parent: targetElement, insertMode: 'prepend' };
      }
      return null;
    case BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT:
      if (targetElement instanceof HTMLElement) {
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

const insertMountEl = (mountEl: HTMLDivElement, placement: BannerMountPlacement) => {
  const { parent, insertMode, anchor } = placement;

  if (!parent.isConnected) {
    return;
  }

  if (mountEl.parentNode === parent) {
    if (insertMode === 'append' && mountEl === parent.lastChild) return;
    if (insertMode === 'prepend' && mountEl === parent.firstChild) return;
    if (insertMode === 'before' && anchor && mountEl.nextSibling === anchor) return;
    if (insertMode === 'after' && anchor && anchor.nextSibling === mountEl) return;
  }

  switch (insertMode) {
    case 'append':
      parent.appendChild(mountEl);
      break;
    case 'prepend':
      parent.insertBefore(mountEl, parent.firstChild);
      break;
    case 'before':
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(mountEl, anchor);
      }
      break;
    case 'after':
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(mountEl, anchor.nextSibling);
      }
      break;
    default:
      parent.appendChild(mountEl);
  }
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
    if (!store || !bannerData) {
      return;
    }

    if (requiresElement && !targetElement) {
      return;
    }

    const mountEl = mountElRef.current;
    if (!mountEl) {
      return;
    }

    const wrapperStyle = getBannerWrapperStyle(bannerData);
    mountEl.className = 'usertour-widget-banner';
    applyStyleObject(mountEl, wrapperStyle);

    const resolved = resolveBannerPlacement(placement, targetElement);
    if (!resolved) {
      return;
    }

    insertMountEl(mountEl, resolved);
  }, [store, bannerData, placement, targetElement, requiresElement, portalEl]);

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
    <BannerRoot
      themeSettings={themeSettings}
      data={bannerData}
      zIndex={zIndex}
      assets={assets}
      globalStyle={globalStyle}
      onDismiss={banner.handleDismiss}
    >
      <BannerFrame>
        <ContentEditorSerialize
          contents={contents}
          userAttributes={userAttributes}
          onClick={banner.handleOnClick}
        />
      </BannerFrame>
    </BannerRoot>,
    mountEl,
  );
};

BannerWidget.displayName = 'BannerWidget';
