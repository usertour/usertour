import { autoUpdate } from '@floating-ui/dom';
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
 * COVER: the mount element sits in the body, fixed over the target's
 * viewport rectangle, and follows it through scroll, resize and layout
 * changes (floating-ui's autoUpdate). The target's DOM is untouched.
 */
const coverStyle = (target: Element, zIndex: number): React.CSSProperties => {
  // Explicit units: these land on the element's style object directly, where
  // a bare number is not a length (React's px shorthand does not apply).
  const rect = target.getBoundingClientRect();
  return {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex,
    ['--usertour-widget-embed-height' as string]: `${rect.height}px`,
  };
};

export const EmbedWidget = ({ embed }: EmbedWidgetProps) => {
  const store = useEmbedStore(embed);
  const mountElRef = useRef<HTMLDivElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  // Live height reported from inside the frame (EmbedRoot measures it); null =
  // pending, keeps an in-flow shell at zero height until the real height lands.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

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
    insertMountEl(mountEl, resolved);
  }, [store, targetElement, placement, isCover, portalEl, measuredHeight]);

  // Cover placement: body-level, tracking the target's rectangle.
  useLayoutEffect(() => {
    const mountEl = mountElRef.current;
    if (!mountEl || !isCover) {
      return;
    }
    if (!store || !targetElement || !document?.body) {
      detachMountEl(mountEl);
      return;
    }
    const body = document.body;
    mountEl.className = MOUNT_CLASS;
    const update = () => {
      applyStyleObject(mountEl, coverStyle(targetElement, zIndex ?? 0));
    };
    update();
    if (mountEl.parentNode !== body) {
      body.appendChild(mountEl);
    }
    const stop = autoUpdate(targetElement, mountEl, update);
    return () => {
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
    <WidgetLocaleProvider locale={store.userLocale}>
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
            <ContentEditorSerialize
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
