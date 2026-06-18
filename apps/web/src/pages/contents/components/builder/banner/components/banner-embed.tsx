import { BUILDER_Z } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useSize } from '@usertour/react-use-size';
import { BannerContainer, BannerPreview, BannerRoot } from '@usertour/widget';
import { ContentEditor } from '@usertour/editor';
import type { ContentEditorRoot } from '@usertour/types';
import {
  ContentEditorElementType,
  ContentActionsItemType,
  BannerEmbedPlacement,
  BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT,
} from '@usertour/types';
import { isEqual } from 'lodash';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useProjectId } from '@/pages/contents/components/builder/core';
import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useOembedInfo } from '@/pages/contents/components/builder/hooks/use-oembed-info';
import { useAws } from '@usertour/hooks';
import { useTranslation } from 'react-i18next';
import { BrowserPreview } from '@/pages/contents/components/builder/banner/components/browser-preview';

const ENABLED_ELEMENT_TYPES = [
  ContentEditorElementType.IMAGE,
  ContentEditorElementType.EMBED,
  ContentEditorElementType.TEXT,
  ContentEditorElementType.BUTTON,
];

const ACTION_ITEMS = [
  ContentActionsItemType.BANNER_DISMIS,
  ContentActionsItemType.FLOW_START,
  ContentActionsItemType.PAGE_NAVIGATE,
  ContentActionsItemType.JAVASCRIPT_EVALUATE,
];

interface PlacementPreviewProps {
  placement: BannerEmbedPlacement;
  banner: ReactNode;
}

// Page-level placements: the banner pins to the top or bottom of a scrolling
// page.
const PagePlacementPreview = (props: PlacementPreviewProps) => {
  const { placement, banner } = props;
  return (
    <div className="h-full flex flex-col relative bg-white dark:bg-card">
      {placement === BannerEmbedPlacement.TOP_OF_PAGE && (
        <div className="flex-shrink-0">{banner}</div>
      )}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-card" />
      {placement === BannerEmbedPlacement.BOTTOM_OF_PAGE && (
        <div className="flex-shrink-0">{banner}</div>
      )}
    </div>
  );
};

interface ElementPlacementPreviewProps extends PlacementPreviewProps {
  targetLabel: string;
}

// Element-relative placements: the banner sits before / after a stand-in target
// element, or inside it against the top / bottom edge.
const ElementPlacementPreview = (props: ElementPlacementPreviewProps) => {
  const { placement, banner, targetLabel } = props;
  return (
    <div className="h-full flex flex-col relative bg-white dark:bg-card">
      <div className="flex-1 overflow-y-auto p-12 pt-20">
        {placement === BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT && banner}
        <div className="border-2 border-dashed border-blue-400 bg-blue-50 rounded min-h-[80px] flex flex-col justify-center">
          {placement === BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT && banner}
          <p className="text-sm font-medium text-blue-600 p-6 text-center">{targetLabel}</p>
          {placement === BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT && banner}
        </div>
        {placement === BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT && banner}
      </div>
    </div>
  );
};

export const BannerEmbed = () => {
  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null);
  const { data: localData, updateData: updateLocalData } = useBannerEditor();
  const { t } = useTranslation();
  const { upload } = useAws();
  const projectId = useProjectId();
  const { attributeList } = useAttributeList();
  const getOembedInfo = useOembedInfo();
  const { contents: contentList } = useContentList();

  const wrapperRect = useSize(wrapperEl);
  const theme = useCurrentTheme({ fallbackToDefault: true });

  // Store the rendered content height (minus theme padding) so saved data keeps
  // an accurate height even if theme padding later changes.
  useEffect(() => {
    if (wrapperRect?.height != null && wrapperRect.height > 0 && theme) {
      const bannerPadding = theme.settings.banner.padding;
      updateLocalData({ height: Math.max(0, wrapperRect.height - bannerPadding * 2) });
    }
  }, [wrapperRect?.height, theme, updateLocalData]);

  const handleContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (!isEqual(value, localData.contents)) {
        updateLocalData({ contents: value });
      }
    },
    [localData, updateLocalData],
  );

  // localData is already normalized; overlay only the preview-only zIndex.
  const data = useMemo(
    () => ({ ...localData, zIndex: localData.zIndex ?? 10000 + BUILDER_Z.canvas }),
    [localData],
  );

  if (!theme) {
    return null;
  }

  const zIndex = data.zIndex;
  const embedPlacement = data.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
  const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(embedPlacement);
  const browserWidth = Math.max(data.maxEmbedWidth ? data.maxEmbedWidth + 400 : 960, 960);

  const banner = (
    <BannerPreview previewMode ref={setWrapperEl}>
      <ContentEditor
        zIndex={BUILDER_Z.canvas}
        customUploadRequest={upload}
        initialValue={localData.contents}
        onValueChange={handleContentChange}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={ENABLED_ELEMENT_TYPES}
        actionItems={ACTION_ITEMS}
        contentList={contentList}
        getOembedInfo={getOembedInfo}
      />
    </BannerPreview>
  );

  return (
    <BannerRoot themeSettings={theme.settings} data={data} zIndex={zIndex}>
      <BannerContainer>
        <BrowserPreview width={browserWidth}>
          {requiresElement ? (
            <ElementPlacementPreview
              placement={embedPlacement}
              banner={banner}
              targetLabel={t('contentBuilder.banner.targetElement')}
            />
          ) : (
            <PagePlacementPreview placement={embedPlacement} banner={banner} />
          )}
        </BrowserPreview>
      </BannerContainer>
    </BannerRoot>
  );
};

BannerEmbed.displayName = 'BannerEmbed';
