import type { ElementSelectorPropsData } from './contents';

export enum BannerEmbedPlacement {
  TOP_OF_PAGE = 'top-of-page',
  BOTTOM_OF_PAGE = 'bottom-of-page',
  TOP_OF_CONTAINER_ELEMENT = 'top-of-container-element',
  BOTTOM_OF_CONTAINER_ELEMENT = 'bottom-of-container-element',
  IMMEDIATELY_BEFORE_ELEMENT = 'immediately-before-element',
  IMMEDIATELY_AFTER_ELEMENT = 'immediately-after-element',
}

/** Placements that require a container/target element (show ContentPlacementManual in builder). */
export const BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT: readonly BannerEmbedPlacement[] = [
  BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT,
  BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT,
  BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT,
  BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT,
];

export interface BannerOuterMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Container/target element for embed placements that attach to an element
 * (TOP_OF_CONTAINER_ELEMENT, BOTTOM_OF_CONTAINER_ELEMENT,
 * IMMEDIATELY_BEFORE_ELEMENT, IMMEDIATELY_AFTER_ELEMENT).
 * Used with ContentPlacementManual in the builder.
 */
export interface BannerData {
  embedPlacement: BannerEmbedPlacement;
  overlayEmbedOverAppContent: boolean;
  stickToTopOfViewport: boolean;
  allowUsersToDismissEmbed: boolean;
  animateWhenEmbedAppears: boolean;
  /** Target element when embed placement is container- or element-relative. */
  containerElement?: ElementSelectorPropsData;
  zIndex?: number;
  maxContentWidth?: number;
  maxEmbedWidth?: number;
  borderRadius?: number;
  outerMargin?: BannerOuterMargin;
}

export const DEFAULT_BANNER_DATA: BannerData = {
  embedPlacement: BannerEmbedPlacement.TOP_OF_PAGE,
  overlayEmbedOverAppContent: false,
  stickToTopOfViewport: false,
  allowUsersToDismissEmbed: true,
  animateWhenEmbedAppears: true,
};
