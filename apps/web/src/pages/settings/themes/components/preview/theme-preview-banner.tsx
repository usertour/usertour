import { DEFAULT_BANNER_DATA } from '@usertour/constants';
import {
  BannerContainer,
  BannerPreview,
  BannerRoot,
  ContentEditorSerialize,
} from '@usertour/widget';
import { BannerEmbedPlacement, type ContentEditorRoot, ThemeTypesSetting } from '@usertour/types';

interface ThemePreviewBannerProps {
  contents: ContentEditorRoot[];
  settings?: ThemeTypesSetting;
  customStyle?: string;
}

export const ThemePreviewBanner = (props: ThemePreviewBannerProps) => {
  const { contents, settings, customStyle } = props;
  if (!settings) {
    return null;
  }

  const data = {
    ...DEFAULT_BANNER_DATA,
    allowUsersToDismissEmbed: true,
    embedPlacement: BannerEmbedPlacement.TOP_OF_PAGE,
    overlayEmbedOverAppContent: false,
    stickToTopOfViewport: false,
    animateWhenEmbedAppears: false,
    zIndex: 1,
    height: undefined,
    contents,
  };

  return (
    <div className="h-full w-full scale-100 p-6">
      <BannerRoot themeSettings={settings} data={data} globalStyle={customStyle}>
        <BannerContainer>
          <BannerPreview previewMode>
            <ContentEditorSerialize contents={contents} />
          </BannerPreview>
        </BannerContainer>
      </BannerRoot>
    </div>
  );
};

ThemePreviewBanner.displayName = 'ThemePreviewBanner';
