import {
  BannerContainer,
  BannerPreview as BannerWidget,
  BannerRoot,
  ContentEditorSerialize,
} from '@usertour/widget';
import {
  BannerEmbedPlacement,
  type ContentEditorRoot,
  DEFAULT_BANNER_DATA,
  type ThemeTypesSetting,
} from '@usertour/types';

export interface BannerPreviewProps {
  contents: ContentEditorRoot[];
  settings: ThemeTypesSetting;
  customStyle?: string;
}

// v2-local banner preview — flush against the browser frame's top edge.
// V1's ThemePreviewBanner wraps the widget in a `p-6` container which leaves
// a gap between the banner and the browser chrome; v2 needs the banner to
// hug the chrome to mirror real-page behavior.
export const BannerPreview = (props: BannerPreviewProps) => {
  const { contents, settings, customStyle } = props;
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
    <BannerRoot themeSettings={settings} data={data} globalStyle={customStyle}>
      <BannerContainer>
        <BannerWidget previewMode>
          <ContentEditorSerialize contents={contents} />
        </BannerWidget>
      </BannerContainer>
    </BannerRoot>
  );
};
