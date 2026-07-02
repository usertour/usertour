import { BannerEmbedPlacement } from '@usertour/types';
import type { BannerData } from '@usertour/types';

/** Placements that require a container/target element (show ContentPlacementManual in builder). */
export const BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT: readonly BannerEmbedPlacement[] = [
  BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT,
  BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT,
  BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT,
  BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT,
];

export const DEFAULT_BANNER_DATA: BannerData = {
  embedPlacement: BannerEmbedPlacement.TOP_OF_PAGE,
  overlayEmbedOverAppContent: false,
  stickToTopOfViewport: false,
  allowUsersToDismissEmbed: true,
  animateWhenEmbedAppears: true,
};
