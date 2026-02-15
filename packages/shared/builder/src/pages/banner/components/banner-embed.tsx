import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useAttributeListContext, useThemeListContext } from '@usertour-packages/contexts';
import { useSize } from '@usertour-packages/react-use-size';
import { BannerContainer, BannerPreview, BannerRoot } from '@usertour-packages/widget';
import { ContentEditor } from '@usertour-packages/shared-editor';
import type { ContentEditorRoot } from '@usertour/types';
import {
  DEFAULT_BANNER_DATA,
  defaultSettings,
  ContentEditorElementType,
  type Theme,
} from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBuilderContext, useBannerContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';
import { getDefaultDataForType } from '../../../utils/default-data';

const DEFAULT_BANNER_CONTENTS = getDefaultDataForType('tooltip') as ContentEditorRoot[];
const DEFAULT_BANNER_PREVIEW_WIDTH = 720;

export const BannerEmbed = () => {
  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null);
  const { localData, updateLocalData } = useBannerContext();
  const { upload } = useAws();
  const { themeList } = useThemeListContext();
  const { currentVersion, projectId } = useBuilderContext();
  const { attributeList } = useAttributeListContext();

  const wrapperRect = useSize(wrapperEl);

  useEffect(() => {
    if (wrapperRect?.height != null && wrapperRect.height > 0) {
      updateLocalData({ height: wrapperRect.height });
    }
  }, [wrapperRect?.height, updateLocalData]);

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

  const theme = useMemo<Theme | undefined>(() => {
    if (!themeList?.length) {
      return undefined;
    }
    if (currentVersion?.themeId) {
      return themeList.find((item) => item.id === currentVersion.themeId);
    }
    return themeList.find((item) => item.isDefault);
  }, [themeList, currentVersion]);

  const themeSettings = theme?.settings ?? defaultSettings;

  const data = useMemo(
    () => ({
      ...DEFAULT_BANNER_DATA,
      ...localData,
      zIndex: localData?.zIndex ?? 11111 + EXTENSION_CONTENT_POPPER,
    }),
    [localData],
  );

  const contents = useMemo(
    () => localData?.contents ?? DEFAULT_BANNER_CONTENTS,
    [localData?.contents],
  );

  const zIndex = data.zIndex ?? 11111 + EXTENSION_CONTENT_POPPER;

  const enabledElementTypes = [
    ContentEditorElementType.IMAGE,
    ContentEditorElementType.EMBED,
    ContentEditorElementType.TEXT,
    ContentEditorElementType.BUTTON,
  ];

  const previewWidth = data.maxEmbedWidth ?? DEFAULT_BANNER_PREVIEW_WIDTH;

  const bannerPreview = (
    <BannerPreview previewMode ref={setWrapperEl} style={{ width: previewWidth, maxWidth: '100%' }}>
      <ContentEditor
        zIndex={zIndex + EXTENSION_CONTENT_POPPER}
        customUploadRequest={handleCustomUploadRequest}
        initialValue={contents}
        onValueChange={handleContentChange}
        projectId={projectId}
        attributes={attributeList}
        enabledElementTypes={enabledElementTypes}
      />
    </BannerPreview>
  );

  const renderPreviewLayout = () => (
    <div className="flex items-center justify-center h-full min-h-[240px] w-full">
      {bannerPreview}
    </div>
  );

  if (!theme || !localData) {
    return null;
  }

  return (
    <BannerRoot themeSettings={themeSettings} data={data} zIndex={zIndex}>
      <BannerContainer>{renderPreviewLayout()}</BannerContainer>
    </BannerRoot>
  );
};

BannerEmbed.displayName = 'BannerEmbed';
