import { EXTENSION_CONTENT_POPPER } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useSize } from '@usertour/react-use-size';
import { BannerContainer, BannerPreview, BannerRoot } from '@usertour/widget';
import { ContentEditor } from '@usertour/editor';
import type { ContentEditorRoot } from '@usertour/types';
import {
  DEFAULT_BANNER_DATA,
  ContentEditorElementType,
  ContentActionsItemType,
  BannerEmbedPlacement,
  BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT,
} from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useProjectId } from '@/pages/contents/components/builder/core';
import { useBannerEditor } from '@/pages/contents/components/builder/builders/banner/use-banner-editor';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useAws } from '@usertour/hooks';
import { getDefaultDataForType } from '@/pages/contents/components/builder/utils/default-data';
import { BrowserPreview } from '@/pages/contents/components/builder/builders/banner/components/browser-preview';

const DEFAULT_BANNER_CONTENTS = getDefaultDataForType('tooltip') as ContentEditorRoot[];

export const BannerEmbed = () => {
  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null);
  const { data: localData, updateData: updateLocalData } = useBannerEditor();
  const { upload } = useAws();
  const projectId = useProjectId();
  const { attributeList } = useAttributeList();
  const { contents: contentList } = useContentList();

  const wrapperRect = useSize(wrapperEl);

  const theme = useCurrentTheme({ fallbackToDefault: true });

  useEffect(() => {
    if (wrapperRect?.height != null && wrapperRect.height > 0 && theme) {
      // Subtract padding from measured height to store only content height
      // This way, if theme padding changes, the height remains accurate
      const bannerPadding = theme.settings.banner.padding;
      const contentHeight = Math.max(0, wrapperRect.height - bannerPadding * 2);
      updateLocalData({ height: contentHeight });
    }
  }, [wrapperRect?.height, theme, updateLocalData]);

  const handleContentChange = useCallback(
    (value: ContentEditorRoot[]) => {
      if (localData && !isEqual(value, localData.contents)) {
        updateLocalData({ contents: value });
      }
    },
    [localData, updateLocalData],
  );

  const handleCustomUploadRequest = useCallback(
    (file: File): Promise<string> => upload(file),
    [upload],
  );

  const data = useMemo(
    () => ({
      ...DEFAULT_BANNER_DATA,
      ...localData,
      zIndex: localData?.zIndex ?? 10000 + EXTENSION_CONTENT_POPPER,
    }),
    [localData],
  );

  const contents = useMemo(
    () => localData?.contents ?? DEFAULT_BANNER_CONTENTS,
    [localData?.contents],
  );

  if (!theme || !localData) {
    return null;
  }

  const zIndex = data.zIndex ?? 10000 + EXTENSION_CONTENT_POPPER;

  const enabledElementTypes = [
    ContentEditorElementType.IMAGE,
    ContentEditorElementType.EMBED,
    ContentEditorElementType.TEXT,
    ContentEditorElementType.BUTTON,
  ];

  const bannerActionItems = [
    ContentActionsItemType.BANNER_DISMIS,
    ContentActionsItemType.FLOW_START,
    ContentActionsItemType.PAGE_NAVIGATE,
    ContentActionsItemType.JAVASCRIPT_EVALUATE,
  ];

  const browserWidth = Math.max(data.maxEmbedWidth ? data.maxEmbedWidth + 400 : 960, 960);

  const bannerPreview = (
    <BannerPreview previewMode ref={setWrapperEl}>
      <ContentEditor
        zIndex={zIndex + EXTENSION_CONTENT_POPPER}
        customUploadRequest={handleCustomUploadRequest}
        initialValue={contents}
        onValueChange={handleContentChange}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={enabledElementTypes}
        actionItems={bannerActionItems}
        contentList={contentList}
      />
    </BannerPreview>
  );

  const embedPlacement = data.embedPlacement ?? BannerEmbedPlacement.TOP_OF_PAGE;
  const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(embedPlacement);

  const browserContent = !requiresElement ? (
    <div className="h-full flex flex-col relative bg-white">
      {embedPlacement === BannerEmbedPlacement.TOP_OF_PAGE && (
        <div className="flex-shrink-0">{bannerPreview}</div>
      )}

      <div className="flex-1 overflow-y-auto bg-white" />

      {embedPlacement === BannerEmbedPlacement.BOTTOM_OF_PAGE && (
        <div className="flex-shrink-0">{bannerPreview}</div>
      )}
    </div>
  ) : (
    <div className="h-full flex flex-col relative bg-white">
      <div className="flex-1 overflow-y-auto p-12 pt-20">
        {embedPlacement === BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT && bannerPreview}
        <div className="border-2 border-dashed border-blue-400 bg-blue-50 rounded min-h-[80px] flex flex-col justify-center">
          {embedPlacement === BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT && bannerPreview}
          <p className="text-sm font-semibold text-blue-600 p-6 text-center">Target Element</p>
          {embedPlacement === BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT && bannerPreview}
        </div>
        {embedPlacement === BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT && bannerPreview}
      </div>
    </div>
  );

  return (
    <BannerRoot themeSettings={theme.settings} data={data} zIndex={zIndex}>
      <BannerContainer>
        <BrowserPreview width={browserWidth}>{browserContent}</BrowserPreview>
      </BannerContainer>
    </BannerRoot>
  );
};

BannerEmbed.displayName = 'BannerEmbed';
