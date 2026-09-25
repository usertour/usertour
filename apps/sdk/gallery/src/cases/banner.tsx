import type { ContentEditorRoot } from '@usertour/types';
import { BannerWidget } from '@/components/banner';
import { buildBannerSnapshot, createFakeBanner } from '../fake/banner';
import { topBanner } from '../fixtures/banner';
import { oneLine, stackedRows } from '../fixtures/content';
import { defaultTheme } from '../fixtures/theme';
import { BlankPage, BlankPageWithReset } from './hosts';
import type { GalleryCase } from './types';

const bannerWidget = (contents: ContentEditorRoot[]) => () => {
  const { banner } = createFakeBanner(
    buildBannerSnapshot({ data: topBanner(contents), theme: defaultTheme }),
  );
  return <BannerWidget banner={banner} />;
};

export const bannerCases: Record<string, GalleryCase> = {
  'banner-one-line': { host: BlankPage, widget: bannerWidget(oneLine) },
  'banner-stacked-rows': { host: BlankPage, widget: bannerWidget(stackedRows) },
  'banner-stacked-rows-reset-page': { host: BlankPageWithReset, widget: bannerWidget(stackedRows) },
};
