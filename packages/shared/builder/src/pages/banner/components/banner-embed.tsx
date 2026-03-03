import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useAttributeListContext } from '@usertour-packages/contexts';
import { useSize } from '@usertour-packages/react-use-size';
import { BannerContainer, BannerPreview, BannerRoot } from '@usertour-packages/widget';
import { ContentEditor } from '@usertour-packages/shared-editor';
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

import { useBuilderContext, useBannerContext } from '../../../contexts';
import { useCurrentTheme } from '../../../hooks/use-current-theme';
import { useAws } from '../../../hooks/use-aws';
import { getDefaultDataForType } from '../../../utils/default-data';
import { BrowserPreview } from './browser-preview';

const DEFAULT_BANNER_CONTENTS = getDefaultDataForType('tooltip') as ContentEditorRoot[];

export const BannerEmbed = () => {
  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null);
  const { localData, updateLocalData } = useBannerContext();
  const { upload } = useAws();
  const { projectId } = useBuilderContext();
  const { attributeList } = useAttributeListContext();

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
