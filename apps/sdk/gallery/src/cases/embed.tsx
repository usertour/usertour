import { DEFAULT_EMBED_DATA } from '@usertour/constants';
import { ContentEditorSerialize, EmbedPreview, EmbedRoot, InlineContainer } from '@usertour/widget';
import { getUserTourCss } from '@/core/usertour-env';
import { oneLine } from '../fixtures/content';
import { BlankPageWithReset } from './hosts';
import type { CaseParams, GalleryCase } from './types';

/**
 * The builder app's page: its preflight reset, and the widget's utility classes
 * on the page itself (the builder compiles them; the SDK only loads them into
 * its frames).
 */
const BuilderPage = () => (
  <>
    <link rel="stylesheet" href={getUserTourCss()} />
    <BlankPageWithReset />
  </>
);

/** The builder's embed preview (a static card, no iframe) with the theme's border on. */
const borderedEmbedPreview = ({ theme }: CaseParams) => {
  const themeSettings = {
    ...theme,
    border: { ...theme.border, borderWidthEnabled: true, borderWidth: 2 },
  };
  return (
    <EmbedRoot themeSettings={themeSettings} data={DEFAULT_EMBED_DATA}>
      <InlineContainer>
        <EmbedPreview>
          <ContentEditorSerialize contents={oneLine} />
        </EmbedPreview>
      </InlineContainer>
    </EmbedRoot>
  );
};

export const embedCases: Record<string, GalleryCase> = {
  'embed-preview-bordered': { host: BuilderPage, widget: borderedEmbedPreview },
};
