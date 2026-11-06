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
import { type CSSProperties, useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { document } from '@/utils';

import {
  type InlineMountPlacement,
  createMountEl,
  placeInFlow,
  resolveElementMountPlacement,
} from './inline-mount';
import { type MountPlacer, usePlacedMount } from './use-placed-mount';

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

const MOUNT_CLASS = 'usertour-widget-banner';
const NO_STYLE: CSSProperties = {};

export const BannerWidget = ({ banner }: BannerWidgetProps) => {
  const store = useBannerStore(banner);
  // Created once; in the page while the banner is open (and, for an
  // element-relative placement, has its target), out of it otherwise, so no
  // banner-sized gap is left in the layout while it is closed.
  const [mountEl] = useState(() => createMountEl(MOUNT_CLASS));
  // Live banner height reported from inside the frame (BannerRoot measures it);
  // null = pending, keeps the wrapper hidden until the reveal can use the real
  // height. BannerRoot fails open after 500ms so this always resolves.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const { bannerData, themeSettings, assets, userAttributes, zIndex, globalStyle } = store ?? {};
  const targetElement = store?.targetElement ?? null;
  const placement = bannerData?.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
  const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(placement);
  const open = Boolean(bannerData && themeSettings) && !(requiresElement && !targetElement);

  const contents = useMemo(() => bannerData?.contents ?? [], [bannerData?.contents]);

  const shellStyle = useMemo<CSSProperties>(
    () =>
      bannerData && themeSettings
        ? getBannerWrapperStyle(bannerData, themeSettings, zIndex, measuredHeight)
        : NO_STYLE,
    [bannerData, themeSettings, zIndex, measuredHeight],
  );
  const placeBanner = useCallback<MountPlacer>(
    (el, target, style) =>
      placeInFlow(el, (next) => resolveBannerPlacement(placement, next), target, style),
    [placement],
  );
  const frameGeneration = usePlacedMount(mountEl, open, targetElement, placeBanner, shellStyle);

  if (!store || !bannerData || !themeSettings || !open || !mountEl) {
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
