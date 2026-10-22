import type { BannerOuterMargin } from './banner';
import type { ElementSelectorPropsData } from './contents';

/**
 * Where an embed mounts relative to its target element. Every placement is
 * element-relative: an embed has no page-level position (that is a banner).
 * The four flow placements share their values with the banner placements so
 * the mount helpers resolve both by value.
 */
export enum EmbedPlacement {
  TOP_OF_CONTAINER_ELEMENT = 'top-of-container-element',
  BOTTOM_OF_CONTAINER_ELEMENT = 'bottom-of-container-element',
  IMMEDIATELY_BEFORE_ELEMENT = 'immediately-before-element',
  IMMEDIATELY_AFTER_ELEMENT = 'immediately-after-element',
  /**
   * Absolutely positioned over the target and sized to it. The target's DOM
   * is untouched; the host keeps rendering underneath.
   */
  COVER_ELEMENT = 'cover-element',
}

export type EmbedOuterMargin = BannerOuterMargin;

/**
 * The embed's shell: the layout decisions stored per content in
 * `Version.data`. Appearance (colors, padding, border) lives in the theme;
 * the content lives in `Step` rows (ADR 0022).
 */
export interface EmbedData {
  placement: EmbedPlacement;
  targetElement?: ElementSelectorPropsData;
  allowUsersToDismiss: boolean;
  zIndex?: number;
  maxContentWidth?: number;
  outerMargin?: EmbedOuterMargin;
}
