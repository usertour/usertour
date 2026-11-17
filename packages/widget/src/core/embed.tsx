import type { AssetAttributes } from '@usertour/frame';
import type { BannerAnimationTiming, EmbedData, ThemeTypesSetting } from '@usertour/types';
import { EmbedCoverAlignment, EmbedPlacement } from '@usertour/types';
import type { CSSProperties } from 'react';
import { forwardRef, memo, useMemo } from 'react';

import { WidgetAnimation } from './class-names';
import {
  INLINE_ANIMATION_TIMING_PRESETS,
  InlineBody,
  InlineRoot,
  getInlineContentWrapperStyle,
  useInlineRootContext,
  type InlineShell,
} from './inline';

// The embed is the second surface of the shared inline shell (./inline): a
// card that lives in the host layout at a target element. What is embed-only
// here is the mapping from its stored data onto the shell and the theme
// section it reads its padding from (ADR 0022).

export const EMBED_DEFAULT_PADDING_PX = 16;
const EMBED_DEFAULT_ANIMATION_DURATION_MS = 320;
const EMBED_DEFAULT_ANIMATION_TIMING: BannerAnimationTiming = 'smooth';

/** Maps the embed's stored data onto the shared inline shell. */
export const toEmbedInlineShell = (data: EmbedData | undefined): InlineShell => ({
  allowDismiss: data?.allowUsersToDismiss ?? false,
  maxContentWidth: data?.maxContentWidth,
  outerMargin: data?.outerMargin,
  // The cover is sized to the target's box and stands in for it, so the shell
  // paints the whole box; the in-flow placements paint their content.
  fill: data?.placement === EmbedPlacement.COVER_ELEMENT,
  fillAlignment: data?.coverAlignment ?? EmbedCoverAlignment.CENTER,
});

export const getEmbedPadding = (themeSetting: ThemeTypesSetting | undefined): number =>
  themeSetting?.embed?.padding ?? EMBED_DEFAULT_PADDING_PX;

/**
 * The reveal animation of an embed with `animateOnAppear` on, null when off.
 * An in-flow embed expands from zero to its measured height while fading in;
 * a cover is sized to its target, so it only fades in. Timing comes from the
 * theme's embed section.
 */
export function getEmbedRevealStyle(
  data: EmbedData | undefined,
  themeSetting: ThemeTypesSetting | undefined,
): CSSProperties | null {
  if (!data?.animateOnAppear) {
    return null;
  }
  const duration = themeSetting?.embed?.animationDuration ?? EMBED_DEFAULT_ANIMATION_DURATION_MS;
  const timing = themeSetting?.embed?.animationTiming ?? EMBED_DEFAULT_ANIMATION_TIMING;
  return {
    animationName:
      data.placement === EmbedPlacement.COVER_ELEMENT
        ? WidgetAnimation.stageReveal
        : WidgetAnimation.embedReveal,
    animationDuration: `${duration}ms`,
    animationTimingFunction: INLINE_ANIMATION_TIMING_PRESETS[timing],
  };
}

/**
 * Host-side wrapper style for an in-flow embed: sized to the live measurement
 * and kept invisible until it lands, so the page never shows a guessed height
 * and a reveal animation only ever runs against the real one.
 */
export function getEmbedWrapperStyle(
  measuredHeight: number | null,
  reveal?: CSSProperties | null,
): CSSProperties {
  const style: CSSProperties = {
    position: 'relative',
    ['--usertour-widget-embed-height' as string]:
      measuredHeight === null ? '0px' : `${measuredHeight}px`,
  };
  if (measuredHeight === null) {
    style.visibility = 'hidden';
  } else if (reveal) {
    Object.assign(style, reveal);
  }
  return style;
}

interface EmbedRootProps {
  themeSettings: ThemeTypesSetting;
  data: EmbedData;
  zIndex?: number;
  assets?: AssetAttributes[];
  globalStyle?: string;
  onDismiss?: () => void;
  /** Fires with the live-measured height (content + padding); see InlineRoot. */
  onMeasuredHeightChange?: (height: number | null) => void;
  children?: React.ReactNode;
}

const EmbedRoot = memo((props: EmbedRootProps) => {
  const { data, zIndex, assets, onDismiss, themeSettings, globalStyle, onMeasuredHeightChange } =
    props;
  const shell = useMemo(() => toEmbedInlineShell(data), [data]);

  return (
    <InlineRoot
      surface="embed"
      themeSettings={themeSettings}
      shell={shell}
      zIndex={zIndex}
      assets={assets}
      globalStyle={globalStyle}
      onDismiss={onDismiss}
      onMeasuredHeightChange={onMeasuredHeightChange}
      getPadding={getEmbedPadding}
    >
      {props.children}
    </InlineRoot>
  );
});

EmbedRoot.displayName = 'EmbedRoot';

interface EmbedPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the embed (e.g. ContentEditor in builder preview). */
  children?: React.ReactNode;
}

/** The non-iframe embed: a static card in the host document (builder and theme previews). */
const EmbedPreview = memo(
  forwardRef<HTMLDivElement, EmbedPreviewProps>((props, ref) => {
    const { children, style, ...restProps } = props;
    const { shell } = useInlineRootContext();
    const contentStyle = useMemo(() => getInlineContentWrapperStyle(shell), [shell]);
    // A filling shell (the cover) takes its host's height, as the live cover
    // takes the target's; everything else sizes to its content.
    const wrapperStyle = useMemo<CSSProperties>(
      () => ({
        position: 'relative',
        ['--usertour-widget-embed-height' as string]: shell.fill ? '100%' : 'auto',
        ...style,
      }),
      [shell.fill, style],
    );

    return (
      <div ref={ref} className="usertour-widget-embed" style={wrapperStyle} {...restProps}>
        <InlineBody style={contentStyle}>{children}</InlineBody>
      </div>
    );
  }),
);

EmbedPreview.displayName = 'EmbedPreview';

export { EmbedRoot, EmbedPreview };
