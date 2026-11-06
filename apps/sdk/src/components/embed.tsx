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
import { type CSSProperties, useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { placeCover } from './embed-cover';
import { createMountEl, placeInFlow, resolveElementMountPlacement } from './inline-mount';
import { type MountPlacer, usePlacedMount } from './use-placed-mount';

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

export const EmbedWidget = ({ embed }: EmbedWidgetProps) => {
  const store = useEmbedStore(embed);
  // Created once; in the page while the embed is open at a target, out of it
  // otherwise, so no empty shell is left in the layout.
  const [mountEl] = useState(() => createMountEl(MOUNT_CLASS));
  // Live height reported from inside the frame (EmbedRoot measures it); null =
  // pending, keeps an in-flow shell at zero height until the real height lands.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const { embedData, currentStep, themeSettings, assets, userAttributes, zIndex } = store ?? {};
  const targetElement = store?.targetElement ?? null;
  const placement = embedData?.placement ?? EmbedPlacement.IMMEDIATELY_AFTER_ELEMENT;
  const isCover = placement === EmbedPlacement.COVER_ELEMENT;

  const contents = useMemo(
    () => (currentStep?.data as ContentEditorRoot[] | undefined) ?? [],
    [currentStep?.data],
  );

  // The shell's own style: a cover fills whatever holds it (see embed-cover),
  // an in-flow shell is as tall as its measured content.
  const shellStyle = useMemo<CSSProperties>(
    () => (isCover ? { zIndex: zIndex ?? 0 } : getEmbedWrapperStyle(measuredHeight)),
    [isCover, zIndex, measuredHeight],
  );
  const placeEmbed = useCallback<MountPlacer>(
    (el, target, style) => {
      if (!target) {
        return null;
      }
      return isCover
        ? placeCover(el, target, style)
        : placeInFlow(el, (next) => resolveElementMountPlacement(placement, next), target, style);
    },
    [isCover, placement],
  );
  const frameGeneration = usePlacedMount(
    mountEl,
    store !== null,
    targetElement,
    placeEmbed,
    shellStyle,
  );

  if (!store || !embedData || !currentStep || !themeSettings || !targetElement || !mountEl) {
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
