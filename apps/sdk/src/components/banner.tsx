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
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { document } from '@/utils';

import {
  type InlineMountPlacement,
  applyStyleObject,
  insertMountEl,
  resolveElementMountPlacement,
} from './inline-mount';

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

/**
 * Page-level placements are the banner's own; element-relative ones are the
 * inline shell's and shared with the embed (./inline-mount).
 */
const resolveBannerPlacement = (
  placement: BannerEmbedPlacement,
  targetElement?: Element | null,
): InlineMountPlacement | null => {
  if (!document?.body) {
    return null;
  }

  switch (placement) {
    case BannerEmbedPlacement.TOP_OF_PAGE:
      return { parent: document.body, insertMode: 'prepend' };
    case BannerEmbedPlacement.BOTTOM_OF_PAGE:
      return { parent: document.body, insertMode: 'append' };
    case BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT:
    case BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT:
    case BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT:
    case BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT:
      return resolveElementMountPlacement(placement, targetElement);
    default:
      return { parent: document.body, insertMode: 'prepend' };
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
  // Live banner height reported from inside the frame (BannerRoot measures it);
  // null = pending, keeps the wrapper hidden until the reveal can use the real
  // height. BannerRoot fails open after 500ms so this always resolves.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

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

    insertMountEl(mountEl, resolved);
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
    <WidgetLocaleProvider locale={store.userLocale}>
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
